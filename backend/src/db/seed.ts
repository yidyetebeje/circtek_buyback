import { db } from './index'
import { roles, users, tenants, warehouses, devices, test_results, sendcloud_config } from './circtek.schema'
import { shops } from './shops.schema';
import { emailTemplateDynamicFields } from './email_template.schema';
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

async function cleanup() {
    console.log('🧹 Cleaning up existing data...');

    // Delete in reverse order of dependencies to avoid foreign key constraints
    await db.delete(test_results);
    await db.delete(devices);
    await db.delete(warehouses);
    await db.delete(shops);
    await db.delete(users);
    await db.delete(roles);
    await db.delete(tenants);

    console.log('✅ Cleanup completed');
}

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
            owner_id: 1, // References the super_admin user
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
        // {
        //     name: 'super_admin',
        //     description: 'Super Admin',
        // },
        // {
        //     name: 'admin',
        //     description: 'Admin',
        // },
        // {
        //     name: 'tester',
        //     description: 'Tester',
        // },
        // {
        //     name: "repair_manager",
        //     description: "Repair Manager",
        // },
        // {
        //     name: "repair_technician",
        //     description: "Repair Technician",
        // },
        // {
        //     name: "stock_manager",
        //     description: "Stock Manager",
        // },
        {
            name: 'shop_manager',
            description: 'Shop Manager',
        }

    ]
    await db.insert(roles).values(roles_data)
}
async function seed_users() {
    const users_data = [
        {
            name: 'John Doe',
            user_name: 'super_admin',
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
        const imei = faker.string.numeric(15);
        const imei2 = faker.string.numeric(15);
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
            serial_number: "K1RUJBELN3KE",
            imei: "362109476572756",
            device_type: 'iPhone',

        });
    }
    await db.insert(test_results).values(test_results_data);
    console.log('Test results seeded successfully');
}
async function seed_shop() {
    const shop_data = [
        {
            name: 'CircTek Electronics Store',
            tenant_id: 1,
            owner_id: 1, // References the super_admin user created in seed_users
            logo: 'https://example.com/logo.png',
            organization: 'CircTek Electronics Ltd.',
            config: {
                theme: {
                    primaryColor: '#1f2937',
                    secondaryColor: '#3b82f6',
                    accentColor: '#10b981'
                },
                features: {
                    deviceTesting: true,
                    repairService: true,
                    buybackProgram: true,
                    diagnostics: true
                },
                settings: {
                    currency: 'USD',
                    timezone: 'America/New_York',
                    language: 'en'
                },
                contact: {
                    supportEmail: 'support@circtek.com',
                    salesEmail: 'sales@circtek.com'
                }
            },
            phone: '+1-555-0123',
            active: 1
        },
        {
            name: 'Mobile Repair Hub',
            tenant_id: 1,
            owner_id: 1,
            logo: 'https://example.com/mobile-hub-logo.png',
            organization: 'Mobile Solutions Inc.',
            config: {
                theme: {
                    primaryColor: '#dc2626',
                    secondaryColor: '#f59e0b',
                    accentColor: '#8b5cf6'
                },
                features: {
                    deviceTesting: true,
                    repairService: true,
                    buybackProgram: false,
                    diagnostics: true
                },
                settings: {
                    currency: 'EUR',
                    timezone: 'Europe/Amsterdam',
                    language: 'en'
                },
                contact: {
                    supportEmail: 'help@mobilehub.com',
                    salesEmail: 'sales@mobilehub.com'
                }
            },
            phone: '+31-20-1234567',
            active: 1
        },
        {
            name: 'TechBuy Solutions',
            tenant_id: 1,
            owner_id: 1,
            logo: 'https://example.com/techbuy-logo.png',
            organization: 'TechBuy Corp.',
            config: {
                theme: {
                    primaryColor: '#059669',
                    secondaryColor: '#0ea5e9',
                    accentColor: '#f97316'
                },
                features: {
                    deviceTesting: false,
                    repairService: false,
                    buybackProgram: true,
                    diagnostics: true
                },
                settings: {
                    currency: 'GBP',
                    timezone: 'Europe/London',
                    language: 'en'
                },
                contact: {
                    supportEmail: 'support@techbuy.com',
                    salesEmail: 'buyback@techbuy.com'
                }
            },
            phone: '+44-20-7946-0958',
            active: 1
        }
    ];

    await db.insert(shops).values(shop_data);
    console.log('Detailed shops seeded successfully');
}

async function seed_email_template_dynamic_fields() {
    console.log('🔧 Seeding email template dynamic fields...');

    const dynamicFields = [
        // Order fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'order.orderNumber',
            displayName: 'Order Number',
            description: 'The unique order number assigned to this order',
            category: 'order',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'order.status',
            displayName: 'Order Status',
            description: 'Current status of the order',
            category: 'order',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'order.estimatedPrice',
            displayName: 'Estimated Price',
            description: 'The estimated price for the device',
            category: 'order',
            dataType: 'currency',
            defaultValue: '0.00',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'order.finalPrice',
            displayName: 'Final Price',
            description: 'The final agreed price for the device',
            category: 'order',
            dataType: 'currency',
            defaultValue: '0.00',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'order.createdAt',
            displayName: 'Order Date',
            description: 'When the order was created',
            category: 'order',
            dataType: 'date',
            defaultValue: '',
            isActive: 1
        },

        // Device fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.modelName',
            displayName: 'Device Model',
            description: 'The name/model of the device',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.brandName',
            displayName: 'Device Brand',
            description: 'The brand of the device',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.categoryName',
            displayName: 'Device Category',
            description: 'The category of the device',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.storage',
            displayName: 'Device Storage',
            description: 'Storage capacity of the device (e.g., 128GB)',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.color',
            displayName: 'Device Color',
            description: 'Color of the device',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'device.condition',
            displayName: 'Device Condition',
            description: 'Condition of the device (e.g., Good, Excellent)',
            category: 'device',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },

        // Customer fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'customer.name',
            displayName: 'Customer Name',
            description: 'The name of the customer/seller',
            category: 'customer',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'customer.email',
            displayName: 'Customer Email',
            description: 'The email address of the customer',
            category: 'customer',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'customer.phone',
            displayName: 'Customer Phone',
            description: 'The phone number of the customer',
            category: 'customer',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },

        // Shop fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'shop.name',
            displayName: 'Shop Name',
            description: 'The name of the shop',
            category: 'shop',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shop.email',
            displayName: 'Shop Email',
            description: 'The contact email of the shop',
            category: 'shop',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shop.phone',
            displayName: 'Shop Phone',
            description: 'The contact phone number of the shop',
            category: 'shop',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shop.address',
            displayName: 'Shop Address',
            description: 'The physical address of the shop',
            category: 'shop',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shop.website',
            displayName: 'Shop Website',
            description: 'The website URL of the shop',
            category: 'shop',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },

        // Shipping fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'shipping.trackingNumber',
            displayName: 'Tracking Number',
            description: 'The shipment tracking number',
            category: 'shipping',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shipping.provider',
            displayName: 'Shipping Provider',
            description: 'The shipping/courier company',
            category: 'shipping',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shipping.labelUrl',
            displayName: 'Shipping Label URL',
            description: 'URL to download the shipping label',
            category: 'shipping',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'shipping.estimatedDelivery',
            displayName: 'Estimated Delivery',
            description: 'Estimated delivery date for the shipment',
            category: 'shipping',
            dataType: 'date',
            defaultValue: '',
            isActive: 1
        },

        // Payment fields
        {
            id: crypto.randomUUID(),
            fieldKey: 'payment.method',
            displayName: 'Payment Method',
            description: 'The payment method used',
            category: 'payment',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'payment.iban',
            displayName: 'Customer IBAN',
            description: 'The IBAN for bank transfer payment',
            category: 'payment',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        },
        {
            id: crypto.randomUUID(),
            fieldKey: 'payment.reference',
            displayName: 'Payment Reference',
            description: 'Payment reference number',
            category: 'payment',
            dataType: 'string',
            defaultValue: '',
            isActive: 1
        }
    ];

    try {
        await db.insert(emailTemplateDynamicFields).values(dynamicFields);
        console.log(`✅ Successfully seeded ${dynamicFields.length} email template dynamic fields`);
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('⚠️ Some dynamic fields already exist, skipping duplicates...');
        } else {
            throw error;
        }
    }
}

async function seed_sendcloud_config() {
    console.log('📦 Seeding Sendcloud config...');

    // Import encryption utility
    const { encrypt } = await import('./index').then(() => import('../utils/encryption'));

    // NOTE: Replace these with actual Sendcloud API keys from your dashboard
    // Go to: Sendcloud Dashboard > Settings > Integrations > API Keys
    // The public_key is your API public key (NOT your email)
    // The secret_key is your API secret key (NOT your password)
    const secretKey = 'YOUR_SENDCLOUD_SECRET_KEY'; // Get from Sendcloud dashboard

    const config_data = {
        tenant_id: 1,
        shop_id: 1, // Associated with Main Shop
        public_key: 'YOUR_SENDCLOUD_PUBLIC_KEY', // Get from Sendcloud dashboard
        secret_key_encrypted: encrypt(secretKey), // Encrypted secret key
        default_sender_address_id: null as number | null, // Not used - sender comes from form or warehouse
        default_shipping_method_id: null as number | null, // Legacy v2 field
        default_shipping_option_code: null as string | null, // V3: Set your preferred shipping option code
        use_test_mode: true, // Enable test mode for development
        is_active: true
    };

    try {
        await db.insert(sendcloud_config).values(config_data);
        console.log('✅ Sendcloud config seeded successfully');
        console.log('⚠️  Remember to update public_key and secret_key with real API keys from Sendcloud!');
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('⚠️ Sendcloud config already exists, skipping...');
        } else {
            console.error('Error seeding sendcloud config:', error);
        }
    }
}
async function seed() {

    await seed_tenants();
    await seed_roles();
    await seed_users();
    await seed_sendcloud_config();
    console.log('🎉 All seeding completed successfully!');
}

// Alternative: Seed without cleanup (handles duplicates gracefully)


// Choose which approach to use:
// seed_test_results(); // This will clean up first
// seedWithoutCleanup(); // This will skip duplicates

// Seed email template dynamic fields

seed_sendcloud_config();
