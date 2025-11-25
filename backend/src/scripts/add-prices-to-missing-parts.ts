
import { db } from '../db/index';
import { purchase_items } from '../db/circtek.schema';
import { eq, desc, and } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: bun run src/scripts/add-prices-to-missing-parts.ts <csv_path> <tenant_id>');
        console.error('Example: bun run src/scripts/add-prices-to-missing-parts.ts ./parts-to-purchase-missing.csv 1');
        process.exit(1);
    }

    const csvPath = path.resolve(args[0]);
    const tenantId = parseInt(args[1], 10);

    if (isNaN(tenantId)) {
        console.error('Error: tenant_id must be a valid number');
        process.exit(1);
    }

    // Generate output path by adding '-with-prices' before the extension
    const ext = path.extname(csvPath);
    const basename = path.basename(csvPath, ext);
    const dirname = path.dirname(csvPath);
    const outputPath = path.join(dirname, `${basename}-with-prices${ext}`);

    console.log(`Reading CSV from: ${csvPath}`);
    console.log(`Using tenant_id: ${tenantId}`);
    console.log(`Output will be saved to: ${outputPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');

    if (lines.length === 0) {
        console.log('CSV is empty');
        return;
    }

    const header = lines[0].trim();
    const newHeader = `${header},Price`;
    const newLines: string[] = [newHeader];

    console.log('Processing items...');

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(',');
        const sku = columns[0]; // Assuming SKU is the first column

        if (!sku) {
            newLines.push(`${line},`);
            continue;
        }

        try {
            const items = await db
                .select({
                    price: purchase_items.price,
                })
                .from(purchase_items)
                .where(
                    and(
                        eq(purchase_items.sku, sku),
                        eq(purchase_items.tenant_id, tenantId)
                    )
                )
                .orderBy(desc(purchase_items.created_at))
                .limit(1);

            const price = items.length > 0 ? items[0].price : '0';
            newLines.push(`${line},${price}`);

            if (i % 50 === 0) {
                console.log(`Processed ${i} items...`);
            }
        } catch (error) {
            console.error(`Error fetching price for SKU ${sku}:`, error);
            newLines.push(`${line},`);
        }
    }

    console.log(`Writing updated CSV to: ${outputPath}`);
    fs.writeFileSync(outputPath, newLines.join('\n'));
    console.log(`Done! Processed ${lines.length - 1} items.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
