/** The extracted job description plus the tab hostname (for the "read from this
 *  tab only" source line). extractJd returns title/company/text; App adds the
 *  hostname from the active tab URL. */
export interface Jd {
  title: string | null;
  company: string | null;
  text: string;
  hostname: string | null;
}
