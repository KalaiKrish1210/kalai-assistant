import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'chatText',
})
export class ChatTextPipe implements PipeTransform {
  transform(value: string): string {
    const escaped = value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />');
  }
}
