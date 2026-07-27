export type CashBalanceInput = {
  openingAmount: number;
  supplies: number;
  withdrawals: number;
  adjustments: number;
  cashSales: number;
};

const money = (value: number) => Number((Number(value) || 0).toFixed(2));

export function calculateExpectedCash(input: CashBalanceInput): number {
  return money(
    money(input.openingAmount) +
    money(input.supplies) -
    money(input.withdrawals) +
    money(input.adjustments) +
    money(input.cashSales)
  );
}

export function canWithdrawCash(amount: number, balance: CashBalanceInput): boolean {
  return Number.isFinite(amount) && amount > 0 && money(amount) <= calculateExpectedCash(balance);
}
