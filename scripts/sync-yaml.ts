import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import yaml from 'js-yaml';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const yamlPath = path.join(rootDir, 'app.yaml');

async function syncYaml() {
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    return;
  }

  if (!fs.existsSync(yamlPath)) {
    console.error('app.yaml file not found');
    return;
  }

  // Load .env
  const envConfig = dotenv.parse(fs.readFileSync(envPath));

  // Load app.yaml
  const yamlConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as any;

  if (!yamlConfig.env_variables) {
    yamlConfig.env_variables = {};
  }

  let updated = false;

  // Sync logic with overrides
  const syncKey = (yamlKey: string, envKey: string) => {
    if (envConfig[envKey] !== undefined) {
      if (yamlConfig.env_variables[yamlKey] !== envConfig[envKey]) {
        console.log(`Updating ${yamlKey} in app.yaml from ${envKey}`);
        yamlConfig.env_variables[yamlKey] = envConfig[envKey];
        updated = true;
      }
    }
  };

  // Special case for DATABASE_URL
  if (envConfig['PROD_DATABASE_URL']) {
    syncKey('DATABASE_URL', 'PROD_DATABASE_URL');
  } else {
    // If no PROD_DATABASE_URL, only sync if it doesn't look like a local one
    const current = yamlConfig.env_variables['DATABASE_URL'] || '';
    if (!current.includes('localhost') && !current.includes('127.0.0.1')) {
       console.log('Skipping DATABASE_URL sync to prevent overwriting production DB with local DB');
    } else {
       syncKey('DATABASE_URL', 'DATABASE_URL');
    }
  }

  const essentialKeys = [
    'GEMINI_API_KEY',
    'RESEND_API_KEY',
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PUBLIC_KEY',
    'VITE_PAYSTACK_PUBLIC_KEY',
    'SESSION_SECRET',
    'GOOGLE_CLOUD_PROJECT'
  ];

  for (const key of essentialKeys) {
    syncKey(key, key);
  }

  if (updated) {
    fs.writeFileSync(yamlPath, yaml.dump(yamlConfig, { noRefs: true, lineWidth: -1 }));
    console.log('app.yaml updated successfully');
  } else {
    console.log('app.yaml is already up to date');
  }
}

syncYaml().catch(err => {
  console.error('Error syncing YAML:', err);
  process.exit(1);
});
