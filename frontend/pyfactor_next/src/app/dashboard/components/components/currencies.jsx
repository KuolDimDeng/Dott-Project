import currencyCodes from 'currency-codes';

const currencyList = Object.entries(currencyCodes).map(([code, name]) => ({
  code,
  name: `${code} - ${name}`,
}));

export default currencyList;