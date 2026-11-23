import {readFile,writeFile} from 'node:fs/promises';
import {retainLegacyAssets} from './retain-legacy-assets.mjs';
import {retainPublishedReleases} from './retain-releases.mjs';
const directory='dist',source=process.env.PUBLISHED_COURSE_URL;
if(source){const release=JSON.parse(await readFile(`${directory}/release.json`));release.legacyAssets=await retainLegacyAssets(directory,source);release.retainedReleases=await retainPublishedReleases(directory,source,{currentId:release.id});for(const file of ['release.json',`releases/${release.id}/release.json`])await writeFile(`${directory}/${file}`,JSON.stringify(release));}
