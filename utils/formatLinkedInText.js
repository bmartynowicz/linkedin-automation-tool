// utils/formatLinkedInText.js

const textFormat = {
    bold: (text) =>
      text.replace(/[A-Za-z]/g, (char) => {
        const code = char.charCodeAt(0);
        return code >= 65 && code <= 90 // Uppercase
          ? String.fromCodePoint(code + 0x1D400 - 0x41)
          : code >= 97 && code <= 122 // Lowercase
          ? String.fromCodePoint(code + 0x1D41A - 0x61)
          : char; // Leave other characters unaltered
      }),
      italic: (text) =>
        text.replace(/[A-Za-z]/g, (char) => {
          const code = char.charCodeAt(0);
          if (char === 'h') {
            return '\u{210E}'; // Explicit Unicode for italic 'h'
          }
          return code >= 65 && code <= 90 // Uppercase
            ? String.fromCodePoint(code + 0x1D434 - 0x41)
            : code >= 97 && code <= 122 // Lowercase
            ? String.fromCodePoint(code + 0x1D44E - 0x61)
            : char; // Leave other characters unaltered
        }),          
        underline: (text) =>
            text
              .split('')
              .map((char) => {
                if (char === ' ') {
                  return '\u00A0\u0332'; // Non-breaking space with underline
                }
                return `${char}\u0332`; // Underline all other characters
              })
              .join(''),                   
  };

function formatLinkedInText(delta) {
let result = '';
let currentListType = null;
let orderedItemCounter = 1;

delta.ops.forEach((op) => {
    if (op.insert) {
    let text = '';

    if (typeof op.insert === 'string') {
        text = op.insert;
    } else {
        return;
    }

    const attrs = op.attributes || {};

    if (attrs.bold) {
        text = textFormat.bold(text);
    }
    if (attrs.italic) {
        text = textFormat.italic(text);
    }
    if (attrs.underline) {
        text = textFormat.underline(text);
    }

    if (attrs.list) {
        if (attrs.list !== currentListType) {
        currentListType = attrs.list;
        result += '\n';
        }

        if (attrs.list === 'bullet') {
        text = `◾ ${text.replace(/\n$/, '')}\n`;
        } else if (attrs.list === 'ordered') {
        text = `${orderedItemCounter++}. ${text.replace(/\n$/, '')}\n`;
        }
    } else {
        currentListType = null;
        orderedItemCounter = 1;
    }

    if (attrs.header) {
        const headerPrefix = '#'.repeat(attrs.header);
        text = `${headerPrefix} ${text.trim()}\n\n`;
    }

    result += text;
    }
});

return result.trim();
}
 
module.exports = {
    formatLinkedInText,
};
  
  