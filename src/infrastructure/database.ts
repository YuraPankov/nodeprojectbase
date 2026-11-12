import Dexie, { type Table } from 'dexie'
import type { Board, BoardNode, Entity, Relation } from '../domain/models'
export class NodebaseDatabase extends Dexie {
 entities!:Table<Entity,string>; relations!:Table<Relation,string>; boards!:Table<Board,string>; boardNodes!:Table<BoardNode,string>
 constructor(){super('nodebase');this.version(1).stores({entities:'id, type, title, updatedAt, archivedAt',relations:'id, fromEntityId, toEntityId, type',boards:'id, title, updatedAt',boardNodes:'id, boardId, entityId, [boardId+entityId]'});this.version(2).stores({entities:'id, type, title, updatedAt, archivedAt',relations:'id, fromEntityId, toEntityId, type',boards:'id, title, updatedAt, sectionKey, parentBoardId, parentEntityId',boardNodes:'id, boardId, entityId, [boardId+entityId]'});this.version(3).stores({entities:'id, type, title, updatedAt, archivedAt',relations:'id, fromEntityId, toEntityId, type',boards:'id, title, updatedAt, sectionKey, parentBoardId, parentEntityId, sortOrder',boardNodes:'id, boardId, entityId, [boardId+entityId]'})}
}
export const db=new NodebaseDatabase()
export const CORE_SECTIONS=[
{key:'identity',title:'ЛИЧНОСТЬ',description:'Личность, роли, ценности и цели'},
{key:'guchigengovo',title:'ГУЧИГЕНГОВО',description:'Организация, команда, артисты и продукты'},
{key:'production',title:'ПРОДЮСИРОВАНИЕ',description:'Артисты, релизы и музыкальные проекты'},
{key:'network',title:'СВЯЗИ',description:'Люди, контакты и партнёры'},
{key:'projects',title:'ПРОЕКТЫ',description:'Проекты, инициативы и направления'},
{key:'knowledge',title:'ЗНАНИЯ',description:'Знания, заметки, исследования и идеи'},
{key:'execution',title:'ДЕЯТЕЛЬНОСТЬ',description:'Задачи, события и процессы'},
{key:'resources',title:'РЕСУРСЫ',description:'Инструменты, финансы и оборудование'}] as const
const sectionForType:Record<string,string[]>={person:['identity','network'],organization:['guchigengovo','network'],artist:['production','guchigengovo'],project:['projects','guchigengovo'],idea:['knowledge'],knowledge:['knowledge'],note:['knowledge'],task:['execution'],event:['execution'],resource:['resources']}
export async function ensureDefaultBoard(){await db.transaction('rw',db.boards,db.entities,db.boardNodes,async()=>{const all=await db.boards.toArray();const map=new Map(all.filter(x=>x.sectionKey).map(x=>[x.sectionKey!,x]));for(let i=0;i<CORE_SECTIONS.length;i++){const s=CORE_SECTIONS[i];if(!map.has(s.key)){const now=new Date().toISOString();const b:Board={id:crypto.randomUUID(),title:s.title,description:s.description,sectionKey:s.key,sortOrder:i,createdAt:now,updatedAt:now};await db.boards.add(b);map.set(s.key,b)}else{const b=map.get(s.key)!;if(b.title===({identity:'Identity',production:'Продюсирование',network:'Network',projects:'Projects',knowledge:'Knowledge',execution:'Execution',resources:'Resources'} as Record<string,string>)[s.key]){b.title=s.title;b.updatedAt=new Date().toISOString();await db.boards.put(b)}if(b.sortOrder===undefined){b.sortOrder=i;await db.boards.put(b)}}}const es=await db.entities.toArray();for(const e of es.filter(x=>x.archivedAt===null)){for(const key of sectionForType[e.type]??['projects']){const b=map.get(key)!;const found=await db.boardNodes.where('[boardId+entityId]').equals([b.id,e.id]).first();if(!found){const n=await db.boardNodes.where('boardId').equals(b.id).count();await db.boardNodes.add({id:crypto.randomUUID(),boardId:b.id,entityId:e.id,positionX:80+(n%4)*250,positionY:80+Math.floor(n/4)*160,displayConfig:{}})}}}})}
export async function createBoard(title:string,parentBoardId:string,parentEntityId:string){const now=new Date().toISOString();const b:Board={id:crypto.randomUUID(),title,description:'Внутреннее пространство: '+title,parentBoardId,parentEntityId,createdAt:now,updatedAt:now};await db.boards.add(b);return b}
export const listBoards=()=>db.boards.toArray()
export const listBoardNodes=(id:string)=>db.boardNodes.where('boardId').equals(id).toArray()
export async function addEntityToBoard(boardId:string,entityId:string){const f=await db.boardNodes.where('[boardId+entityId]').equals([boardId,entityId]).first();if(f)return;const n=await db.boardNodes.where('boardId').equals(boardId).count();await db.boardNodes.add({id:crypto.randomUUID(),boardId,entityId,positionX:80+(n%4)*250,positionY:80+Math.floor(n/4)*160,displayConfig:{}})}
export const saveNodePosition=(id:string,x:number,y:number)=>db.boardNodes.update(id,{positionX:x,positionY:y})
export const removeNodeFromBoard=(id:string)=>db.boardNodes.delete(id)


export async function createSection(title:string,description:string){
 const sections=(await db.boards.toArray()).filter(b=>!!b.sectionKey&&!b.parentBoardId);
 const now=new Date().toISOString();
 const b:Board={id:crypto.randomUUID(),title:title.trim().toLocaleUpperCase('ru-RU'),description:description.trim(),sectionKey:'custom-'+crypto.randomUUID(),sortOrder:sections.length,createdAt:now,updatedAt:now};
 await db.boards.add(b);return b;
}
export async function updateSection(id:string,title:string,description:string){
 const b=await db.boards.get(id);if(!b||!b.sectionKey||b.parentBoardId)throw new Error('Раздел не найден');
 b.title=title.trim().toLocaleUpperCase('ru-RU');b.description=description.trim();b.updatedAt=new Date().toISOString();await db.boards.put(b);return b;
}
export async function deleteSection(id:string){
 const b=await db.boards.get(id);if(!b||!b.sectionKey||b.parentBoardId)throw new Error('Раздел не найден');
 const children=await db.boards.where('parentBoardId').equals(id).count();if(children)throw new Error('Сначала удалите или переместите внутренние пространства этого раздела');
 await db.transaction('rw',db.boards,db.boardNodes,async()=>{await db.boardNodes.where('boardId').equals(id).delete();await db.boards.delete(id)});
}
export async function reorderSections(ids:string[]){
 await db.transaction('rw',db.boards,async()=>{for(let i=0;i<ids.length;i++){const b=await db.boards.get(ids[i]);if(b&&b.sectionKey&&!b.parentBoardId){b.sortOrder=i;b.updatedAt=new Date().toISOString();await db.boards.put(b)}}});
}

export async function listAllBoardNodes():Promise<BoardNode[]>{return db.boardNodes.toArray()}
