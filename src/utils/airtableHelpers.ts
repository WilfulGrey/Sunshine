import { Task, TaskPriority } from '../types/Task';
import { AirtableContact } from '../services/airtableService';
import { generateId } from './helpers';

export const convertAirtableContactToTask = (contact: AirtableContact): Task => {
  const fullName = `${contact.fields['Imię']} ${contact.fields['Nazwisko']}`;
  
  // Debug: sprawdź czy pole "Komentarz status nön" jest pobierane
  console.log('=== DEBUG AIRTABLE CONTACT ===');
  console.log('Full name:', fullName);
  console.log('All fields:', Object.keys(contact.fields));
  console.log('Komentarz status n8n:', contact.fields['Komentarz status n8n']);
  console.log('==============================');
  
  // Parsuj datę "kiedy dzwonić"
  let dueDate: Date | undefined;
  if (contact.fields['kiedy dzwonić']) {
    const dateStr = contact.fields['kiedy dzwonić'];
    console.log(`Parsing date for ${fullName}: "${dateStr}"`);
    let tempDate: Date | undefined;
    
    // 1. Spróbuj nowy format Airtable: "15/9/2025 12:00am" lub "15/9/2025 12:00pm"
    const newFormatMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(am|pm)$/i);
    if (newFormatMatch) {
      const [, day, month, year, hourStr, minuteStr, ampm] = newFormatMatch;
      let hours = parseInt(hourStr);
      const minutes = parseInt(minuteStr);
      
      // Konwertuj na format 24-godzinny
      if (ampm.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      tempDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
      console.log(`✅ Parsed new format: ${tempDate.toLocaleString('de-DE')}`);
    }
    
    // 2. Jeśli nie udało się, spróbuj stary format: "15.09.2025 14:30"
    if (!tempDate || isNaN(tempDate.getTime())) {
      const oldFormatMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
      if (oldFormatMatch) {
        const [, day, month, year, hours, minutes] = oldFormatMatch;
        tempDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        console.log(`✅ Parsed old format: ${tempDate.toLocaleString('de-DE')}`);
      }
    }
    
    // 3. Jeśli nie udało się, spróbuj format tylko daty: "15.09.2025"
    if (!tempDate || isNaN(tempDate.getTime())) {
      const dateOnlyMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dateOnlyMatch) {
        const [, day, month, year] = dateOnlyMatch;
        tempDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 9, 0); // Domyślnie 9:00
        console.log(`✅ Parsed date only format: ${tempDate.toLocaleString('de-DE')}`);
      }
    }
    
    // 4. Jeśli nadal nie udało się, spróbuj ISO format
    if (!tempDate || isNaN(tempDate.getTime())) {
      tempDate = new Date(dateStr);
      if (!isNaN(tempDate.getTime())) {
        console.log(`✅ Parsed ISO format: ${tempDate.toLocaleString('de-DE')}`);
      }
    }
    
    // Sprawdź czy tempDate jest prawidłową datą
    if (tempDate && !isNaN(tempDate.getTime())) {
      dueDate = tempDate;
      console.log(`✅ Final parsed date for ${fullName}: ${dueDate.toLocaleString('de-DE')}`);
    } else {
      console.warn(`❌ Failed to parse date "${dateStr}" for ${fullName}. Setting to undefined.`);
      dueDate = undefined;
    }
  }

  // Określ priorytet na podstawie daty
  let priority: TaskPriority = 'medium';
  
  // NAJPIERW sprawdź pole "Urgent" z Airtable
  if (contact.fields['Urgent'] === true) {
    priority = 'urgent';
    console.log(`✅ ${fullName} oznaczony jako URGENT w Airtable`);
  } else if (dueDate) {
    const now = new Date();
    // Porównaj tylko daty bez czasu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffInDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      priority = 'urgent'; // Przeterminowane
    } else if (diffInDays === 0) {
      priority = 'urgent'; // Dzisiaj
    } else if (diffInDays === 1) {
      priority = 'high'; // Jutro
    } else if (diffInDays <= 3) {
      priority = 'medium'; // W ciągu 3 dni
    } else {
      priority = 'low'; // Później
    }
  } else {
    // Brak daty - domyślny priorytet medium
    priority = 'medium';
  }

  // Generuj opis zadania
  const description = `Kontakt z ${fullName}. ${
    contact.fields['DRI'] ? `Przypisane do: ${contact.fields['DRI']}. ` : ''
  }${
    contact.fields['ID_MM'] ? `ID MM: ${contact.fields['ID_MM']}.` : ''
  }`.trim();

  return {
    id: contact.id, // Używamy ID z Airtable
    title: `${fullName} - Kontakt telefoniczny`,
    description,
    type: 'manual',
    priority,
    status: 'pending',
    dueDate,
    assignedTo: contact.fields['DRI'] || undefined,
    category: 'Matching & Kontakt',
    createdAt: contact.fields['Created at'] ? new Date(contact.fields['Created at']) : new Date(),
    history: [],
    // Dodatkowe dane z Airtable
    airtableData: {
      recordId: contact.id,
      phoneNumber: contact.fields['Numer telefonu'],
      profileLink: contact.fields['Link do profilu w portalu'],
      retellLink: contact.fields['Link do retell'],
      jobLink: contact.fields['Link do JOBa'],
      mmId: contact.fields['ID_MM'],
      previousRecommendation: contact.fields['Komentarz status n8n'],
      nextSteps: contact.fields['Następne kroki'],
      urgent: contact.fields['Urgent'],
      user: contact.fields['User'],
      wklejkaUrl: contact.fields['Wklejka'],
      wklejkaDate: contact.fields['Data wklejki'] ? new Date(contact.fields['Data wklejki']) : undefined,
      nieudaneWklejki: contact.fields['Ile nieudanych wklejek'] || 0
    }
  };
};

export const isOverdueContact = (contact: AirtableContact): boolean => {
  if (!contact.fields['kiedy dzwonić']) return false;
  
  const callDate = new Date(contact.fields['kiedy dzwonić']);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Resetuj czas do początku dnia
  
  return callDate < now;
};

export const formatCallDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Dzisiaj';
    } else if (diffInDays === 1) {
      return 'Jutro';
    } else if (diffInDays === -1) {
      return 'Wczoraj';
    } else if (diffInDays > 1 && diffInDays <= 7) {
      return `Za ${diffInDays} dni`;
    } else if (diffInDays < -1 && diffInDays >= -7) {
      return `${Math.abs(diffInDays)} dni temu`;
    } else {
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  } catch (error) {
    return dateStr;
  }
};