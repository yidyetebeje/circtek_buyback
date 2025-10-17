// read repairs.csv file
import fs from 'fs';
import path from 'path';

const repairsCsvPath = path.join(__dirname, 'repairs.csv');
const repairsCsv = fs.readFileSync(repairsCsvPath, 'utf8');
const repairs = repairsCsv.split('\n').map(row => row.split(','));
// extract the reason column and save it separate file here is header id,repair_update_create_key,imei,reason,description,partcode,user,repair_number,scan_date,phonecheck_model,phonecheck_memory,repair_dates,warehouse_order_id,warehouse_quantity,created_at,updated_at
// and remove the duplicates entry so every reason only occurs once
const reasonColumn = new Set(repairs.map(row => row[0]));
fs.writeFileSync('reason.txt', Array.from(reasonColumn).join('\n'));