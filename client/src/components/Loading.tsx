export default function Loading({size=44}:{size?:number}){
  return (
    <div className="flex justify-center items-center">
      <div style={{width:size, height:size}} className="animate-spin rounded-full border-4 border-t-transparent border-brand-500"></div>
    </div>
  )
}
