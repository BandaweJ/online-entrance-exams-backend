import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    
    if (accountSid && authToken && accountSid.startsWith('AC')) {
      this.client = twilio(accountSid, authToken);
    } else {
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      if (!this.client) {
        return;
      }

      const fromNumber = this.configService.get('TWILIO_FROM_NUMBER');
      
      await this.client.messages.create({
        body: message,
        from: fromNumber,
        to: to,
      });

    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendBulkSMS(recipients: string[], message: string): Promise<void> {
    const promises = recipients.map(recipient => this.sendSMS(recipient, message));
    await Promise.allSettled(promises);
  }
}
