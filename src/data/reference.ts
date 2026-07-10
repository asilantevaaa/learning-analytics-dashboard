import data from './reference.json'

export interface RefPage {
  title: string
  href: string
}
export interface RefChapter {
  title: string
  href: string
  pages: RefPage[]
}

export const REFERENCE = data as RefChapter[]
