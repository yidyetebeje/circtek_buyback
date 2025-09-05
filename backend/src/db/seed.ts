import { db } from './index'
import { roles, users, tenants, warehouses, devices, test_results } from './circtek.schema'
import { shops } from './shops.schema';
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker';

async function seed_tenants() {
    const tenants_data = [
        {
            id: 1,
            name: 'Circtek',
            description: 'Circtek',
            status: true,
        }
    ];
    await db.insert(tenants).values(tenants_data);
    console.log('Tenants seeded successfully');
}

async function seed_shops() {
    const shops_data = [
        {
            id: 1,
            name: 'Main Shop',
            tenant_id: 1,
        }
    ];
    await db.insert(shops).values(shops_data);
    console.log('Shops seeded successfully');
}

async function seed_warehouses() {
    const warehouses_data = [
        {
            id: 1,
            name: 'Main Warehouse',
            description: 'Main warehouse for all stock',
            tenant_id: 1,
            shop_id: 1,
            
        }
    ];
    await db.insert(warehouses).values(warehouses_data);
    console.log('Warehouses seeded successfully');
}

async function seed_roles() {
    const roles_data = [
        {
            name: 'super_admin',
            description: 'Super Admin',
        },
        {
            name: 'admin',
            description: 'Admin',
        },
        {
            name: 'tester',
            description: 'Tester',
        },
        {
            name: "repair_manager",
            description: "Repair Manager",
        },
        {
            name: "repair_technician",
            description: "Repair Technician",
        },
        {
            name: "stock_manager",
            description: "Stock Manager",
        },        
        
    ]
    await db.insert(roles).values(roles_data)
}

async function seed_users() {
    const users_data = [
        {
            name: 'John Doe',
            user_name: 'super_admin',
            email: 'super_admin@circtek.com',
            password: 'password',
            role_id: 1,
            tenant_id: 1,
            status: true,
        }
    ]
    // hash the password
    const hashed_password = await bcrypt.hash('password', 10)
    users_data[0].password = hashed_password
    await db.insert(users).values(users_data)
    console.log('Users seeded successfully')
}

async function seed_devices() {
    const devices_data: typeof devices.$inferInsert[] = [];
    const storageOptions = ['64GB', '128GB', '256GB', '512GB'];
    const memoryOptions = ['4GB', '6GB', '8GB'];
    const colorOptions = ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red'];
    const modelNames = ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15'];
    const modelNumbers = ['A1865', 'A1901', 'A1902', 'A1920', 'A2097'];

    for (let i = 1; i <= 15; i++) {
        const storage = faker.helpers.arrayElement(storageOptions);
        const memory = faker.helpers.arrayElement(memoryOptions);
        const color = faker.helpers.arrayElement(colorOptions);
        const modelIdx = i % 5;
        const model_name = modelNames[modelIdx];
        const model_no = modelNumbers[modelIdx];
        const sku = `APL-${model_no}-${storage}-${color.replace(/\s+/g, '').toUpperCase()}`;
        const lpn = `LPN-${faker.string.alphanumeric(8).toUpperCase()}`;
        const imei = faker.phone.imei();
        const imei2 = faker.phone.imei();
        const guid = faker.string.uuid();

        devices_data.push({
            id: i,
            sku,
            lpn,
            make: 'Apple',
            model_no,
            model_name,
            storage,
            memory,
            color,
            device_type: 'iPhone',
            serial: faker.string.alphanumeric(12).toUpperCase(),
            imei,
            imei2,
            guid,
            description: faker.commerce.productDescription(),
            status: true,
            tenant_id: 1,
            warehouse_id: 1,
        });
    }
    await db.insert(devices).values(devices_data);
    console.log('Devices seeded successfully');
}

async function seed_test_results() {
    const test_results_data = [];
    for (let i = 1; i <= 15; i++) {
        test_results_data.push({
            tenant_id: 1,
            device_id: i,
            warehouse_id: 1,
            tester_id: 1,
            passed_components: 'screen, camera',
            failed_components: 'battery, accelerometer',
            serial_number: faker.string.alphanumeric(12).toUpperCase(),
            imei: faker.phone.imei(),
            device_type: 'iPhone',
        
        });
    }
    await db.insert(test_results).values(test_results_data);
    console.log('Test results seeded successfully');
}

async function seed() {
    await seed_tenants();
    await seed_shops();
    await seed_warehouses();
    await seed_roles();
    await seed_users();
    await seed_devices();
    await seed_test_results();
}

seed();
