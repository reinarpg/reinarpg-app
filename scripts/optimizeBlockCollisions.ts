import fs from 'fs'
import supportedVersions from '../src/supportedVersions.mjs'
import { join } from 'path'

type Shape = number[]

interface Shapes {
  blocks: Record<string, number | number[]>
  shapes: Record<string, Shape[]>
}

const shapesMap = new Map<string, number>()
const processData = (data: Shapes) => {
  const sizeInput = JSON.stringify(data).length
  let replaced = 0
  let shapesToRemove = new Set<number>()
  for (const [block, shapes] of Object.entries(data.blocks)) {
    const arr = Array.isArray(shapes)
    const shapesArr = Array.isArray(shapes) ? shapes : [shapes]
    for (const [i, id] of shapesArr.entries()) {
      const resolved = data.shapes[id]
      const shapesKey = resolved.map(x => x.join(',')).join(';')
      const existingShapeId = shapesMap.get(shapesKey)
      // todo-low the size can be optimized even futher by splitting data into shape-parts
      if (existingShapeId !== undefined && existingShapeId !== id) {
        // console.log(`duplicate for ${block}: ${existingShapeId}`)
        if (arr) data.blocks[block][i] = existingShapeId
        else data.blocks[block] = existingShapeId
        replaced++
        shapesToRemove.add(id)
      }
      else {
        shapesMap.set(shapesKey, id)
      }
    }
  }
  for (const shape of shapesToRemove) {
    delete data.shapes[shape]
  }
  const sizeOutput = JSON.stringify(data).length
  console.log('Saving', replaced, sizeInput / 1024, '->', sizeOutput / 1024, Math.round(sizeInput / sizeOutput), 'x')
  return data
}

for (const version of [...supportedVersions].reverse()) {
  const dataPath = join(require.resolve('reinarpg-data'), '../rpg-data/data/pc', version, 'blockCollisionShapes.json');
  
  // Check if the data path exists
  if (fs.existsSync(dataPath)) {
    console.log('Using blockCollisionShapes of version', version);
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    data.version = version;

    // Process the data
    processData(data);

    // Ensure the directory exists
    try {
      fs.mkdirSync('./generated', { recursive: true });
      console.log('Directory ./generated created or already exists.');
      
      // Write the data to the file      
      fs.writeFile('./generated/latestBlockCollisionsShapes.json', JSON.stringify(data), err => {
        if (err) {
          console.error(err);
        } else {
          // file written successfully
        }
      });

      console.log('File written to ./generated/latestBlockCollisionsShapes.json');
      
      break;
    } catch (err) {
      console.error('Error writing the file or creating directory:', err);
    }
  } else {
    console.log(`Data path for version ${version} does not exist:`, dataPath);
  }
}

// const path = './node_modules/.pnpm/reinarpg-data@3.45.0/node_modules/reinarpg-data/rpg-data/data/pc/1.19/blockCollisionShapes.json'
