interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface CallStatus {
  callSid?: string;
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  duration?: number;
  error?: string;
}

export class TwilioService {
  private config: TwilioConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load from environment variables
    const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || localStorage.getItem('twilio_account_sid') || '';
    const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || localStorage.getItem('twilio_auth_token') || '';
    const phoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || localStorage.getItem('twilio_phone_number') || '';

    this.config = { accountSid, authToken, phoneNumber };
    console.log('Loaded Twilio config:', { 
      accountSid: accountSid ? accountSid.substring(0, 8) + '...' : 'missing',
      phoneNumber: phoneNumber || 'missing'
    });
  }

  public updateConfig(newConfig: TwilioConfig): void {
    this.config = newConfig;
    // Save to localStorage
    localStorage.setItem('twilio_account_sid', newConfig.accountSid);
    localStorage.setItem('twilio_auth_token', newConfig.authToken);
    localStorage.setItem('twilio_phone_number', newConfig.phoneNumber);
  }

  private ensureConfigured(): void {
    if (!this.config?.accountSid || !this.config?.authToken || !this.config?.phoneNumber) {
      throw new Error('Twilio nie jest skonfigurowany. Sprawdź Account SID, Auth Token i numer telefonu.');
    }
  }

  async makeCall(toPhoneNumber: string, taskTitle: string): Promise<CallStatus> {
    this.ensureConfigured();

    try {
      console.log('🔄 Inicjuję połączenie Twilio...');
      console.log('From:', this.config!.phoneNumber);
      console.log('To:', toPhoneNumber);
      console.log('Task:', taskTitle);

      // Clean phone number - remove spaces and non-digit characters except +
      const cleanToNumber = toPhoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '');
      const cleanFromNumber = this.config!.phoneNumber.replace(/\s/g, '').replace(/[^\d+]/g, '');

      // Create the API request to Twilio
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config!.accountSid}/Calls.json`;
      
      const formData = new URLSearchParams();
      formData.append('To', cleanToNumber);
      formData.append('From', cleanFromNumber);
      formData.append('Url', 'http://demo.twilio.com/docs/voice.xml'); // Simple TwiML that says "Hello"
      formData.append('Method', 'GET');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config!.accountSid}:${this.config!.authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twilio API Error: ${errorData.message || response.statusText}`);
      }

      const callData = await response.json();
      console.log('✅ Połączenie zainicjowane:', callData.sid);

      return {
        callSid: callData.sid,
        status: 'initiated'
      };

    } catch (error) {
      console.error('❌ Błąd podczas inicjowania połączenia:', error);
      
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCallStatus(callSid: string): Promise<CallStatus> {
    this.ensureConfigured();

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config!.accountSid}/Calls/${callSid}.json`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config!.accountSid}:${this.config!.authToken}`),
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get call status: ${response.statusText}`);
      }

      const callData = await response.json();
      
      return {
        callSid: callData.sid,
        status: callData.status,
        duration: callData.duration ? parseInt(callData.duration) : undefined
      };

    } catch (error) {
      console.error('❌ Błąd podczas pobierania statusu połączenia:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCalls(): Promise<any> {
    this.ensureConfigured();

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config!.accountSid}/Calls.json?PageSize=1`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config!.accountSid}:${this.config!.authToken}`),
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get calls: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Błąd podczas pobierania listy połączeń:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!(this.config?.accountSid && this.config?.authToken && this.config?.phoneNumber);
  }

  getConfig(): TwilioConfig | null {
    return this.config;
  }
}

export const twilioService = new TwilioService();