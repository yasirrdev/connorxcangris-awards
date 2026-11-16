'use client';
import {useEffect,useState} from 'react';
export default function Countdown({until,label}:{until:string;label:string}) {
  const [left,setLeft]=useState<number|null>(null);
  useEffect(()=>{
    const update=()=>setLeft(Math.max(0,Math.ceil((Date.parse(until)-Date.now())/1000)));
    update();
    const id=setInterval(update,1000);
    return ()=>clearInterval(id);
  },[until]);
  if (left===null) return null;
  const cells=[['días',Math.floor(left/86400)],['h',Math.floor(left/3600)%24],['min',Math.floor(left/60)%60],['s',left%60]];
  return <div className="countdown"><p>{label}</p>{cells.map(([unit,value])=><span key={unit}><b>{String(value).padStart(2,'0')}</b> {unit}</span>)}</div>;
}

