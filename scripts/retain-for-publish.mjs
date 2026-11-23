import {pathToFileURL} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {retainLegacyAssets} from './retain-legacy-assets.mjs';
import {retainPublishedReleases} from './retain-releases.mjs';
export async function retainForPublish(directory,source){
 if(!source)return;
 const release=JSON.parse(await readFile(`${directory}/release.json`));
 release.legacyAssets=await retainLegacyAssets(directory,source);
 release.retainedReleases=await retainPublishedReleases(directory,source,{currentId:release.id});
 // Previously installed workers resolve unlisted root requests inside their
 // selected release. Populate every retained tree as well as the root so those
 // workers can still start the original loader before they are replaced.
 for(const id of [release.id,...release.retainedReleases])for(const file of release.legacyAssets){
  const target=`${directory}/releases/${id}/${file.path}`;
  await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
  await writeFile(target,await readFile(`${directory}/${file.path}`));
 }
 for(const file of ['release.json',`releases/${release.id}/release.json`])await writeFile(`${directory}/${file}`,JSON.stringify(release));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await retainForPublish('dist',process.env.PUBLISHED_COURSE_URL);
