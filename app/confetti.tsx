export default function Confetti() {
  return <span className="confetti" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</span>;
}

