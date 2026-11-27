import { Linking } from 'react-native';

import type { WhatsAppGateway } from '@/features/collections/services/CollectionService';

export class ReactNativeWhatsAppGateway implements WhatsAppGateway {
  canOpen(url: string): Promise<boolean> {
    return Linking.canOpenURL(url);
  }

  async open(url: string): Promise<void> {
    await Linking.openURL(url);
  }
}
