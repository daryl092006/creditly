export function numberToFrench(n: number): string {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (n === 0) return 'zéro';

    function convert(num: number): string {
        if (num < 10) return units[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) {
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            if (ten === 7) { // 70-79
                if (unit === 0) return 'soixante-dix';
                if (unit === 1) return 'soixante-et-onze';
                return 'soixante-' + teens[unit];
            }
            if (ten === 9) { // 90-99
                if (unit === 0) return 'quatre-vingt-dix';
                return 'quatre-vingt-' + teens[unit];
            }
            if (unit === 0) { // 20, 30, 40, 50, 60, 80
                if (ten === 8) return 'quatre-vingts'; // Special case for 80
                return tens[ten];
            }
            if (unit === 1 && ten !== 8) return tens[ten] + '-et-un'; // 21, 31, 41, 51, 61
            if (ten === 8) return 'quatre-vingt-' + units[unit]; // 81-89
            return tens[ten] + '-' + units[unit];
        }
        if (num < 1000) {
            const hundred = Math.floor(num / 100);
            const remainder = num % 100;
            let hundredText = '';
            if (hundred === 1) {
                hundredText = 'cent';
            } else {
                hundredText = units[hundred] + (remainder === 0 ? ' cents' : ' cent');
            }
            return remainder === 0 ? hundredText : hundredText + ' ' + convert(remainder);
        }
        if (num < 1000000) {
            const thousand = Math.floor(num / 1000);
            const remainder = num % 1000;
            const thousandText = thousand === 1 ? 'mille' : convert(thousand) + ' mille';
            return remainder === 0 ? thousandText : thousandText + ' ' + convert(remainder);
        }
        if (num < 1000000000) {
            const million = Math.floor(num / 1000000);
            const remainder = num % 1000000;
            const millionText = million === 1 ? 'un million' : convert(million) + ' millions';
            return remainder === 0 ? millionText : millionText + ' ' + convert(remainder);
        }
        return num.toString();
    }

    return convert(n).replace(/\s+/g, ' ').trim();
}
