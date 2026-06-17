export class AddBankAccountDto {
  accountNumber!: string;
  accountHolderName!: string;
  ifscCode!: string;
  bankName?: string;
}

export class UpdateBankAccountDto {
  accountNumber?: string;
  accountHolderName?: string;
  ifscCode?: string;
  bankName?: string;
  isActive?: boolean;
}
