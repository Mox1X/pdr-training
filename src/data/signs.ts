import catalogue from './catalogue.json' with { type: 'json' };
import supporting from '../../data/catalogue/supporting.json' with { type: 'json' };
import reviewContext from '../../data/catalogue/review-context.json' with { type: 'json' };
import inventory from '../../data/catalogue/inventory.json' with { type: 'json' };
export type SignCategory = 'warning' | 'priority' | 'prohibition' | 'mandatory' | 'information' | 'service' | 'plate';

export interface RoadSign {
  id: string;
  number: string;
  category: SignCategory;
  name: string;
  answerLabel: string;
  images?: string[];
  image: string;
  explanation: string;
  details?: string[];
  source: string;
}

export const RULES_SOURCE = 'https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF';
export const SOURCE_REVIEW_DATE = '11.11.2026';

export const categories: { id: SignCategory; name: string; description: string; sampleId: string }[] = [
  { id: 'warning', name: 'Попереджувальні', description: 'Звертають увагу на небезпеку', sampleId: '1.1' },
  { id: 'priority', name: 'Пріоритету', description: 'Визначають черговість проїзду', sampleId: '2.3' },
  { id: 'prohibition', name: 'Заборонні', description: 'Запроваджують обмеження', sampleId: '3.21' },
  { id: 'mandatory', name: 'Наказові', description: 'Вказують дозволені напрямки', sampleId: '4.1' },
  { id: 'information', name: 'Інформаційно-вказівні', description: 'Допомагають орієнтуватися на дорозі', sampleId: '5.1' },
  { id: 'service', name: 'Сервісу', description: 'Позначають корисні об’єкти', sampleId: '6.1' },
  { id: 'plate', name: 'Таблички', description: 'Уточнюють дію дорожніх знаків', sampleId: '7.1.1' },
];

export const signs: readonly RoadSign[] = catalogue.map<RoadSign>(entry => ({ ...entry, details: [...new Set([...(supporting[entry.id as keyof typeof supporting] ?? []).map(p=>p.text), ...(entry.explanation !== inventory[entry.id as keyof typeof inventory].ruleText ? [inventory[entry.id as keyof typeof inventory].ruleText] : []), ...(reviewContext[entry.number[0] as keyof typeof reviewContext] ?? [])])], category: entry.category as SignCategory }));
export const signsById = new Map(signs.map(entry => [entry.id, entry]));
