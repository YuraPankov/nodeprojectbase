import Dexie, { type Table } from 'dexie'
import type { Board, BoardNode, Entity, Relation } from '../domain/models'
export class NodebaseDatabase extends Dexie {
 entities!:Table<Entity,string>; relations!:Table<Relation,string>; boards!:Table<Board,string>; boardNodes!:Table<BoardNode,string>
 constructor(){super('nodebase');this.version(1).stores({entities:'id, type, title, updatedAt, archivedAt',relations:'id, fromEntityId, toEntityId, type',boards:'id, title, updatedAt',boardNodes:'id, boardId, entityId, [boardId+entityId]'});this.version(2).stores({entities:'id, type, title, updatedAt, archivedAt',relations:'id, fromEntityId, toEntityId, type',boards:'id, title, updatedAt, sectionKey, parentBoardId, parentEntityId',boardNodes:'id, boardId, entityId, [boardId+entityId]'})}
}
export const db=new NodebaseDatabase()
export const CORE_SECTIONS=[
{key:'identity',title:'Identity',description:'Личность, роли, ценности и цели'},
{key:'guchigengovo',title:'ГУЧИГЕНГОВО',description:'Организация, команда, артисты и продукты'},
{key:'production',title:'Продюсирование',description:'Артисты, релизы и музыкальные проекты'},
{key:'network',title:'Network',description:'Люди, контакты и партнёры'},
{key:'projects',title:'Projects',description:'Проекты, инициативы и направления'},
{key:'knowledge',title:'Knowledge',description:'Знания, заметки, исследования и идеи'},
{key:'execution',title:'Execution',description:'Задачи, события и процессы'},
{key:'resources',title:'Resources',description:'Инструменты, финансы и оборудование'}] as const
const sectionForType:Record<string,string[]>={person:['identity','network'],organization:['guchigengovo','network'],artist:['production','guchigengovo'],project:['projects','guchigengovo'],idea:['knowledge'],knowledge:['knowledge'],note:['knowledge'],task:['execution'],event:['execution'],resource:['resources']}
export async function ensureDefaultBoard(){await db.transaction('rw',db.boards,db.entities,db.boardNodes,async()=>{const all=await db.boards.toArray();const map=new Map(all.filter(x=>x.sectionKey).map(x=>[x.sectionKey!,x]));for(const s of CORE_SECTIONS){if(!map.has(s.key)){const now=new Date().toISOString();const b:Board={id:crypto.randomUUID(),title:s.title,description:s.description,sectionKey:s.key,createdAt:now,updatedAt:now};await db.boards.add(b);map.set(s.key,b)}}const es=await db.entities.toArray();for(const e of es.filter(x=>x.archivedAt===null)){for(const key of sectionForType[e.type]??['projects']){const b=map.get(key)!;const found=await db.boardNodes.where('[boardId+entityId]').equals([b.id,e.id]).first();if(!found){const n=await db.boardNodes.where('boardId').equals(b.id).count();await db.boardNodes.add({id:crypto.randomUUID(),boardId:b.id,entityId:e.id,positionX:80+(n%4)*250,positionY:80+Math.floor(n/4)*160,displayConfig:{}})}}}})}
export async function createBoard(title:string,parentBoardId:string,parentEntityId:string){const now=new Date().toISOString();const b:Board={id:crypto.randomUUID(),title,description:'Внутреннее пространство: '+title,parentBoardId,parentEntityId,createdAt:now,updatedAt:now};await db.boards.add(b);return b}
export const listBoards=()=>db.boards.toArray()
export const listBoardNodes=(id:string)=>db.boardNodes.where('boardId').equals(id).toArray()
export async function addEntityToBoard(boardId:string,entityId:string){const f=await db.boardNodes.where('[boardId+entityId]').equals([boardId,entityId]).first();if(f)return;const n=await db.boardNodes.where('boardId').equals(boardId).count();await db.boardNodes.add({id:crypto.randomUUID(),boardId,entityId,positionX:80+(n%4)*250,positionY:80+Math.floor(n/4)*160,displayConfig:{}})}
export const saveNodePosition=(id:string,x:number,y:number)=>db.boardNodes.update(id,{positionX:x,positionY:y})
export const removeNodeFromBoard=(id:string)=>db.boardNodes.delete(id)
