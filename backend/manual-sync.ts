import { BackMarketSyncService } from './src/buyback/services/backMarketSyncService';
import { BackMarketService } from './src/buyback/services/backMarketService';

async function runSync() {
  const apiService = new BackMarketService();
  
  console.log('Fetching listings from API...');
  const response = await apiService.getListings({ limit: 5 });
  console.log('Response status:', response.status);
  
  if (response.ok) {
      const data = await response.json();
      console.log('Data:', JSON.stringify(data, null, 2));
  } else {
      console.log('Error:', await response.text());
  }
}

runSync();
