let boundaries=require('../../data/kenya-counties.json');
async function loadBoundaries(){return boundaries;}
function pointInRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function pointInPolygon(point,geometry){const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;return polygons.some(poly=>pointInRing(point,poly[0])&&!poly.slice(1).some(hole=>pointInRing(point,hole)));}
function countyName(feature){return feature.properties.County||feature.properties.COUNTY||feature.properties.county||feature.properties.NAME||feature.properties.Name;}
const corridorCountyOffices={
  Kisumu:'KeNHA Kisumu Regional Office',
  Busia:'KeNHA Busia Regional Office'
};
function routeOffice(latitude,longitude){
  if(!boundaries)throw Object.assign(new Error('Verified county boundaries are not loaded.'),{status:503});
  const match=boundaries.features.find(f=>pointInPolygon([longitude,latitude],f.geometry));
  if(!match)throw Object.assign(new Error('The submitted location is outside Kenya’s official county boundaries.'),{status:400});
  const county=countyName(match);
  if(!Object.prototype.hasOwnProperty.call(corridorCountyOffices,county)){
    throw Object.assign(new Error('This report is outside the Kisumu-Busia study corridor. Please submit locations within Kisumu or Busia County.'),{status:400});
  }
  return {county,office:corridorCountyOffices[county],studyArea:'Kisumu-Busia road corridor'};
}
function officeAliases(office){
  const value=String(office||'').trim();
  const legacy=value.replace(/^(?:KeNHA|KeRRA)\s+/i,'');
  const region=legacy.match(/^(Kisumu|Busia)(?: County)?(?: Regional Office| Region)?$/i);
  if(region){const canonical=`${region[1][0].toUpperCase()}${region[1].slice(1).toLowerCase()} Regional Office`;return [...new Set([value,legacy,canonical,`KeNHA ${canonical}`,`KeRRA ${canonical}`])];}
  return [value];
}
function sameRegionalOffice(first,second){
  const aliases=new Set(officeAliases(first));
  return officeAliases(second).some(value=>aliases.has(value));
}
function makeReference(){return `KRR-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;}function getBoundaries(){return boundaries;}function setBoundariesForTest(data){boundaries=data;}module.exports={loadBoundaries,routeOffice,officeAliases,sameRegionalOffice,makeReference,getBoundaries,setBoundariesForTest};
