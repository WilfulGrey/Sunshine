import Airtable from 'airtable';

export interface AirtableContact {
  id: string;
  fields: {
    'Imię': string;
    'Nazwisko': string;
    'kiedy dzwonić': string;
    'Numer telefonu': string;
    'Created at': string;
    'DRI': string;
    'ID_MM': string;
    'Link do retell': string;
    'Link do profilu w portalu': string;
    'Link do JOBa': string;
    'Komentarz status n8n': string;
    'Następne kroki'?: string;
    'Status': string;
    'Urgent'?: boolean;
    'User'?: string;
    'Wklejka'?: string;
    'Data wklejki'?: string;
    'Ile nieudanych wklejek'?: number;
  };
}

interface AirtableConfig {
  apiKey: string;
  baseId: string;
  tableId: string;
}

export class AirtableService {
  private config: AirtableConfig | null = null;
  private base: any = null;
  private table: any = null;

  constructor() {
    this.loadConfigFromEnv();
    if (!this.config?.apiKey || !this.config?.baseId) {
      this.loadConfig(); // Fallback to localStorage
    }
    this.initializeAirtable();
  }

  private loadConfigFromEnv(): void {
    // Spróbuj najpierw załadować z zmiennych środowiskowych
    const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;
    const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;
    const tableId = import.meta.env.VITE_AIRTABLE_TABLE_ID || 'tblm5BBDM1qZS40sM';

    if (apiKey && baseId && tableId) {
      this.config = { apiKey, baseId, tableId };
      console.log('Loaded Airtable config from environment variables');
    }
  }

  private loadConfig(): void {
    // Załaduj z localStorage jako fallback
    const apiKey = localStorage.getItem('airtable_api_key') || '';
    const baseId = localStorage.getItem('airtable_base_id') || '';
    const tableId = localStorage.getItem('airtable_table_id') || 'tblm5BBDM1qZS40sM';

    this.config = { apiKey, baseId, tableId };
    console.log('Loaded Airtable config from localStorage');
  }

  private initializeAirtable(): void {
    if (!this.config?.apiKey) {
      console.warn('Airtable API Key is missing');
      return;
    }
    
    if (!this.config?.baseId) {
      console.warn('Airtable Base ID is missing');
      return;
    }

    if (!this.config?.tableId) {
      console.warn('Airtable Table ID is missing');
      return;
    }

    try {
      console.log('Initializing Airtable with Base ID:', this.config.baseId.substring(0, 8) + '...');
      this.base = new Airtable({ apiKey: this.config.apiKey }).base(this.config.baseId);
      this.table = this.base(this.config.tableId);
      console.log('Airtable initialized successfully for table ID:', this.config.tableId);
    } catch (error) {
      console.error('Failed to initialize Airtable:', error);
    }
  }

  public updateConfig(newConfig: AirtableConfig): void {
    this.config = newConfig;
    this.initializeAirtable();
  }

  private ensureInitialized(): void {
    if (!this.table) {
      this.loadConfig();
      this.initializeAirtable();
    }

    if (!this.table) {
      throw new Error('Airtable nie jest skonfigurowany. Sprawdź API Key, Base ID i Table ID.');
    }
  }

  async getContacts(): Promise<AirtableContact[]> {
    this.ensureInitialized();

    try {
      console.log('Fetching contacts from Airtable table ID:', this.config?.tableId);
      
      const records = await this.table.select({
        // Sortuj według daty "kiedy dzwonić"
        sort: [{ field: 'kiedy dzwonić', direction: 'asc' }],
        // Pobierz tylko rekordy gdzie "kiedy dzwonić" nie jest puste i status to "czeka na kontakt"
        filterByFormula: "AND({kiedy dzwonić} != '', {Imię} != '', {Nazwisko} != '', {Status} = 'czeka na kontakt')",
        maxRecords: 100 // Ogranicz do 100 rekordów dla testów
      }).all();

      console.log(`Found ${records.length} matching records in Airtable`);
      
      return records.map(record => ({
        id: record.id,
        fields: record.fields as AirtableContact['fields']
      }));
    } catch (error) {
      console.error('Błąd podczas pobierania kontaktów z Airtable:', error);
      
      // Dodaj więcej szczegółów o błędzie
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      throw error;
    }
  }

  async updateContact(recordId: string, fields: Partial<AirtableContact['fields']>): Promise<void> {
    this.ensureInitialized();

    try {
      await this.table.update(recordId, fields);
    } catch (error) {
      console.error('Błąd podczas aktualizacji kontaktu w Airtable:', error);
      throw error;
    }
  }

  async createContact(fields: Omit<AirtableContact['fields'], 'Created at'>): Promise<AirtableContact> {
    this.ensureInitialized();

    try {
      const record = await this.table.create(fields);
      return {
        id: record.id,
        fields: record.fields as AirtableContact['fields']
      };
    } catch (error) {
      console.error('Błąd podczas tworzenia kontaktu w Airtable:', error);
      throw error;
    }
  }

  async getAvailableUsers(): Promise<string[]> {
    this.ensureInitialized();

    try {
      // Pobierz wszystkie unikalne wartości z pola User
      const records = await this.table.select({
        fields: ['User']
      }).all();

      const users = new Set<string>();
      
      console.log(`Processing ${records.length} records for User field...`);
      
      records.forEach(record => {
        const userField = record.fields['User'];
        console.log('User field value:', userField, 'Type:', typeof userField);
        
        if (Array.isArray(userField)) {
          userField.forEach(user => {
            console.log('Adding user from array:', user);
            users.add(user);
          });
        } else if (userField) {
          console.log('Adding user as string:', userField);
          users.add(userField);
        }
      });

      const availableUsers = Array.from(users).sort();
      console.log('🔍 Available users in Airtable:', availableUsers);
      return availableUsers;
    } catch (error) {
      console.error('Błąd podczas pobierania dostępnych użytkowników:', error);
      return [];
    }
  }
}

export const airtableService = new AirtableService();