export const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', label: 'Real (BR)', locale: 'pt-BR' },
  { code: 'AOA', symbol: 'Kz', label: 'Kwanza (AO)', locale: 'pt-AO' },
  { code: 'USD', symbol: '$', label: 'Dólar (US)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro (EU)', locale: 'de-DE' },
];

export const formatCurrency = (value: number, currencyCode: string) => {
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  
  if (currency.code === 'AOA') {
     // Custom format for Kwanza to ensure it shows "Kz" correctly
     return new Intl.NumberFormat(currency.locale, {
       style: 'currency',
       currency: 'AOA',
       currencyDisplay: 'symbol',
     }).format(value).replace('AOA', 'Kz');
  }

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
  }).format(value);
};
