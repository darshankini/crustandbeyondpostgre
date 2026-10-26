// UPI payment QR printed at the bottom of the customer bill.
// The link is decoded from the shop's merchant QR (Google Pay for Business), so any UPI app can scan it.
import QRCode from 'qrcode';

export const UPI_LINK =
  'upi://pay?pa=7972466906@okbizaxis&pn=Crust&Beyond&mc=5814&aid=uGICAgLCMnfOFag&ver=01&mode=01&tr=BCR2DN7DWS35DK2R';

let cached = null;

// QR module grid: { size, dark(row, col) }. Built once, shared by the thermal and browser receipts.
export function upiQr() {
  if (!cached) {
    const { modules } = QRCode.create(UPI_LINK, { errorCorrectionLevel: 'M' });
    cached = { size: modules.size, dark: (r, c) => !!modules.get(r, c) };
  }
  return cached;
}
