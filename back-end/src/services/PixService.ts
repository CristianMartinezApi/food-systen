import * as QRCode from 'qrcode';

interface GeneratePixQRCodeInput {
  key: string;              // CPF, CNPJ, email ou celular
  amount: number;           // Valor em centavos (ex: 15000 = R$ 150,00)
  orderId: string;          // ID do pedido (descrição)
  recipientName?: string;   // Nome do recebedor
}

const hasRepeatedDigits = (value: string) => /^(\d)\1+$/.test(value);

const isValidCpf = (value: string) => {
  if (!/^\d{11}$/.test(value) || hasRepeatedDigits(value)) return false;
  const calculateDigit = (length: number) => {
    const sum = value.slice(0, length).split('').reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculateDigit(9) === Number(value[9]) && calculateDigit(10) === Number(value[10]);
};

const isValidCnpj = (value: string) => {
  if (!/^\d{14}$/.test(value) || hasRepeatedDigits(value)) return false;
  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce(
      (total, digit, index) => total + Number(digit) * weights[index],
      0
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const firstDigit = calculateDigit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(`${value.slice(0, 12)}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return firstDigit === Number(value[12]) && secondDigit === Number(value[13]);
};

/**
 * Serviço para gerar QR Codes PIX dinâmicos
 * Gera strings PIX válidas conforme especificação EMV-QRCPS-STR do Banco Central
 * Compatível com qualquer app de banco/pagamento que leia PIX
 */
export class PixService {
  private static readonly PIX_GUI = 'BR.GOV.BCB.PIX';
  private static readonly DEFAULT_MERCHANT_CITY = 'SAO PAULO';

  /**
   * Helper para estruturar campos EMV
   * Formato: [ID][LENGTH][VALUE]
   */
  private static encodeEMVField(id: string, value: string): string {
    const length = String(value.length).padStart(2, '0');
    return `${id}${length}${value}`;
  }

  /**
   * Calcula CRC16 (checksum) para validação da string PIX
   */
  private static calculateCRC16(data: string): string {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc << 1) ^ (((crc & 0x8000) ? 0x1021 : 0) & 0xffff);
      }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  }

  private static sanitizeText(value: string, maxLength: number): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .substring(0, maxLength) || 'NA';
  }

  private static sanitizePixKey(key: string): string {
    return key.trim();
  }

  private static buildTxid(orderId: string): string {
    const rawTxid = `PEDIDO${orderId}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return rawTxid.substring(0, 25) || 'PEDIDO';
  }

  /**
   * Gera um QR Code PIX dinâmico com valor e chave específicos
   * @returns Base64 da imagem do QR code
   */
  static async generateDynamicPixQRCode(
    input: GeneratePixQRCodeInput
  ): Promise<string> {
    try {
      // Gerar string PIX
      const pixString = this.generatePixCopiaCola(
        input.key,
        input.amount,
        input.orderId,
        input.recipientName
      );

      // Gerar imagem do QR code a partir da string PIX
      const qrcodeImage = await QRCode.toDataURL(pixString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });

      return qrcodeImage; // Data URL (base64)
    } catch (error) {
      console.error('Erro ao gerar QR code PIX:', error);
      throw new Error('Falha ao gerar QR code PIX');
    }
  }

  /**
   * Validar se a chave PIX está no formato correto
   */
  static validatePixKey(key: string, type: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const randomRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    switch (type) {
      case 'cpf':
        return isValidCpf(key);
      case 'cnpj':
        return isValidCnpj(key);
      case 'email':
        return emailRegex.test(key);
      case 'phone':
        const phoneDigits = key.replace(/[^\d]/g, '');
        return /^\d{10,11}$/.test(phoneDigits) || /^55\d{10,11}$/.test(phoneDigits);
      case 'random':
        return randomRegex.test(key);
      default:
        return false;
    }
  }

  /**
   * Gerar uma cópia e cola PIX (string EMV-QRCPS-STR válida)
   * Formato: 00020126...6360...
   * Referência: Resolução 1 do Banco Central
   */
  static generatePixCopiaCola(
    key: string,
    amount: number,
    orderId: string,
    recipientName?: string
  ): string {
    try {
      const sanitizedName = this.sanitizeText(recipientName || 'EMPRESA', 25);
      const merchantCity = this.sanitizeText(this.DEFAULT_MERCHANT_CITY, 15);
      const cleanKey = this.sanitizePixKey(key);
      const txid = this.buildTxid(orderId);

      // Valor em reais (sempre com 2 casas decimais)
      const reais = (amount / 100).toFixed(2);

      // Merchant Account Information (ID 26) conforme padrão PIX
      let merchantAccountInfo = '';
      merchantAccountInfo += this.encodeEMVField('00', this.PIX_GUI);
      merchantAccountInfo += this.encodeEMVField('01', cleanKey);

      // Additional Data Field Template (ID 62) com TXID do pedido
      let additionalDataField = '';
      additionalDataField += this.encodeEMVField('05', txid);

      // Construir dados iniciais (sem CRC)
      let emvData = '';
      emvData += this.encodeEMVField('00', '01'); // Payload Format Indicator
      emvData += this.encodeEMVField('01', '11'); // Point of Initiation Method (estatico)
      emvData += this.encodeEMVField('26', merchantAccountInfo); // Merchant Account (PIX)
      emvData += this.encodeEMVField('52', '0000'); // Merchant Category Code
      emvData += this.encodeEMVField('53', '986'); // Transaction Currency (BRL)

      // Valor (ID 54) - apenas se houver valor
      if (amount > 0) {
        emvData += this.encodeEMVField('54', reais);
      }

      emvData += this.encodeEMVField('58', 'BR'); // Country Code
      emvData += this.encodeEMVField('59', sanitizedName);
      emvData += this.encodeEMVField('60', merchantCity);
      emvData += this.encodeEMVField('62', additionalDataField);

      // Calcular CRC16 (sem o próprio campo CRC)
      const crc = this.calculateCRC16(emvData + '6304');

      // String PIX final
      const pixString = emvData + this.encodeEMVField('63', crc);

      return pixString;
    } catch (error) {
      console.error('Erro ao gerar cópia e cola PIX:', error);
      throw new Error('Falha ao gerar cópia e cola PIX');
    }
  }
}
