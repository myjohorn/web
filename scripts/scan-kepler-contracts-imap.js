/**
 * IMAP Scanner for mykepleredu@gmail.com
 * Fetches international school contract, agreement, and commission emails
 */
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

const USER_EMAIL = process.env.KEPLER_EMAIL || 'mykepleredu@gmail.com';
const APP_PASSWORD = process.env.KEPLER_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || 'tagsztdtycowzmzh';

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'kepler-contracts-found.json');

async function main() {
    console.log('Connecting to Gmail IMAP for', USER_EMAIL, '...');
    
    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: USER_EMAIL,
            pass: APP_PASSWORD
        },
        logger: false
    });

    await client.connect();
    console.log(' Connected successfully to IMAP server!\n');

    // List mailboxes to confirm
    const mailboxes = await client.list();
    console.log('Mailboxes available:', mailboxes.map(m => m.path).join(', '));

    // Prefer [Gmail]/All Mail (전체보관함) if available, otherwise INBOX
    let targetBox = 'INBOX';
    const allMail = mailboxes.find(m => m.path.includes('All Mail') || m.specialUse === '\\All');
    if (allMail) {
        targetBox = allMail.path;
    }
    console.log(`\nOpening mailbox: "${targetBox}"...`);

    const lock = await client.getMailboxLock(targetBox);
    const contractsFound = [];

    try {
        console.log('Searching for contract & commission related emails...');

        // Search terms
        const searchKeywords = [
            'contract', 'agreement', 'commission', 'agent', 'agency',
            'mou', 'partnership', 'invictus', 'marlborough', 'raffles',
            'sunway', 'crescendo', 'chis', 'stellar', 'shattuck', 'tenby',
            'repton', 'fairview', 'ras', 'invoice', '정산', '계약', '커미션', '협약'
        ];

        // Fetch all message headers or search by OR
        // Using ImapFlow search
        const query = {
            or: [
                { body: 'contract' },
                { body: 'agreement' },
                { body: 'commission' },
                { body: 'agent' },
                { body: 'agency' },
                { body: 'mou' },
                { body: 'partnership' },
                { body: 'invictus' },
                { body: 'marlborough' },
                { body: 'raffles' },
                { body: 'sunway' },
                { body: 'crescendo' },
                { body: 'chis' },
                { body: 'stellar' },
                { body: 'shattuck' },
                { body: 'tenby' },
                { body: 'invoice' },
                { body: '계약' },
                { body: '커미션' }
            ]
        };

        const searchResults = await client.search(query, { uid: true });
        console.log(` Found ${searchResults.length} candidate messages in ${targetBox}.\n`);

        if (searchResults.length === 0) {
            console.log('No matching messages found.');
            return;
        }

        // Fetch and parse messages (sorted newest to oldest)
        const uidsToFetch = searchResults.slice(-100).reverse(); // take last 100

        console.log(`Fetching and analyzing ${uidsToFetch.length} messages...\n`);

        for (const uid of uidsToFetch) {
            const message = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
            if (!message || !message.source) continue;

            const parsed = await simpleParser(message.source);

            const subject = parsed.subject || '(No Subject)';
            const from = parsed.from ? parsed.from.text : '';
            const to = parsed.to ? parsed.to.text : '';
            const date = parsed.date ? parsed.date.toISOString() : '';
            const text = (parsed.text || '').replace(/\s+/g, ' ');

            // Check if relevant to international schools or contracts
            const corpus = (subject + ' ' + from + ' ' + text).toLowerCase();

            // Detect School
            let schoolName = '';
            if (corpus.includes('invictus')) schoolName = 'Invictus International School';
            else if (corpus.includes('marlborough')) schoolName = 'Marlborough College Malaysia';
            else if (corpus.includes('raffles') || corpus.includes('ras')) schoolName = 'Raffles American School';
            else if (corpus.includes('sunway')) schoolName = 'Sunway International School';
            else if (corpus.includes('crescendo') || corpus.includes('chis')) schoolName = 'Crescendo-HELP International School';
            else if (corpus.includes('shattuck') || corpus.includes('ssm')) schoolName = "Shattuck-St. Mary's";
            else if (corpus.includes('stellar')) schoolName = 'Stellar International School';
            else if (corpus.includes('tenby')) schoolName = 'Tenby Schools';
            else if (corpus.includes('repton')) schoolName = 'Repton Malaysia';
            else if (corpus.includes('fairview')) schoolName = 'Fairview International School';
            else if (corpus.includes('kepler')) schoolName = 'Kepler Academy';
            else if (corpus.includes('hunky dory')) schoolName = 'Hunky Dory';
            else if (corpus.includes('international school') || corpus.includes('국제학교')) schoolName = 'International School (General)';

            // Detect contract / commission keywords
            const isContract = /contract|agreement|mou|partnership|계약|협약/i.test(corpus);
            const isCommission = /commission|커미션|수수료|요율|fee\s*split|rebate/i.test(corpus);
            const isInvoice = /invoice|billing|인보이스|청구/i.test(corpus);

            if (!schoolName && !isContract && !isCommission) {
                // Not school or contract related
                continue;
            }

            // Extract rates (e.g. 10%, 15%, RM 3,000)
            const rateMatches = text.match(/([0-9]{1,2}(?:\.[0-9]+)?%|RM\s*[0-9,]+)/gi);
            const uniqueRates = rateMatches ? Array.from(new Set(rateMatches)).slice(0, 5) : [];

            // Attachments info
            const attachments = (parsed.attachments || []).map(att => ({
                filename: att.filename || 'unnamed',
                contentType: att.contentType,
                size: att.size
            }));

            const itemSummary = {
                uid,
                date: date.slice(0, 10),
                from,
                to,
                subject,
                schoolName: schoolName || 'General School / Agency',
                isContract,
                isCommission,
                isInvoice,
                detectedRates: uniqueRates,
                attachments: attachments.map(a => a.filename),
                snippet: text.slice(0, 300)
            };

            contractsFound.push(itemSummary);
            console.log(`[${contractsFound.length}] [${itemSummary.date}] [${itemSummary.schoolName}] ${subject}`);
            if (itemSummary.attachments.length > 0) {
                console.log(`     Attachments: ${itemSummary.attachments.join(', ')}`);
            }
            if (uniqueRates.length > 0) {
                console.log(`     Rates detected: ${uniqueRates.join(', ')}`);
            }
        }

    } finally {
        lock.release();
    }

    await client.logout();
    console.log('\n IMAP logout complete.');

    // Save summary
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contractsFound, null, 2), 'utf8');
    console.log(`\n Successfully saved ${contractsFound.length} contract/school related items to: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error(' Error:', err.message);
});
