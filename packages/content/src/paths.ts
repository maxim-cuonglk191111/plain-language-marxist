/** Repository layout conventions (SDD §4.3, §5.1). All paths use forward slashes. */
export const WORKS_DIR = "content/works";
export const VOCABULARY_DIR = "content/vocabulary";
export const COLLECTIONS_DIR = "content/collections";
export const GOVERNANCE_FILE = "governance.yml";

export const WORK_FILE = "work.yml";
export const SOURCE_FILE = "source.yml";
export const ORIGINAL_TERMS_FILE = "original-terms.yml";
export const EXPLANATIONS_FILE = "explanations.yml";
export const CROSSREFS_FILE = "crossrefs.yml";

/** `{language}-{register}.yml`, e.g. en-plain.yml. */
export const RENDERING_FILE = /^([a-z]{2,3})-([a-z0-9]+(?:-[a-z0-9]+)*)\.yml$/;

export const renderingFileName = (language: string, register: string) =>
  `${language}-${register}.yml`;

/** Public reader path of a document: the source URL's path (SDD §10.1). */
export const publicPath = (sourceUrl: string) => new URL(sourceUrl).pathname;
