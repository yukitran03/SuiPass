// frontend/src/lib/sui-config.ts file

import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig, useNetworkVariable } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: import.meta.env.VITE_SUI_PACKAGE_ID || '',
    },
  },
});

export { networkConfig, useNetworkVariable };