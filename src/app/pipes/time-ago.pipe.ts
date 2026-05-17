import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | Date): string {

    if (!value) return '';

    // convert to Date object if string was passed
    const date = typeof value === 'string' ? new Date(value) : value;

    // check if date is valid
    if (isNaN(date.getTime())) return '';

    const now        = new Date();
    const diffMs     = now.getTime() - date.getTime();
    const diffSecs   = Math.floor(diffMs / 1000);
    const diffMins   = Math.floor(diffSecs / 60);
    const diffHours  = Math.floor(diffMins / 60);
    const diffDays   = Math.floor(diffHours / 24);
    const diffWeeks  = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears  = Math.floor(diffDays / 365);

    if (diffSecs  <  60)  return 'just now';
    if (diffMins  <  60)  return `${diffMins} minute${diffMins  === 1 ? '' : 's'} ago`;
    if (diffHours <  24)  return `${diffHours} hour${diffHours  === 1 ? '' : 's'} ago`;
    if (diffDays  <   7)  return `${diffDays} day${diffDays     === 1 ? '' : 's'} ago`;
    if (diffWeeks <   5)  return `${diffWeeks} week${diffWeeks  === 1 ? '' : 's'} ago`;
    if (diffMonths < 12)  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    return                       `${diffYears} year${diffYears  === 1 ? '' : 's'} ago`;
  }
}