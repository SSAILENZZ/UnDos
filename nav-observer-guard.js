(()=>{
  const Native=window.MutationObserver;
  if(!Native||window.__undosNavObserverGuard)return;
  window.__undosNavObserverGuard=true;
  window.__undosNativeMutationObserver=Native;

  class GuardedMutationObserver extends Native{
    constructor(callback){
      let suppressFlatNav=false;
      super((records,observer)=>{
        if(suppressFlatNav&&records.length&&records.every(r=>r.target?.id==='nav'))return;
        callback(records,observer);
      });
      this.__undosSuppressFlatNav=()=>{suppressFlatNav=true};
    }
    observe(target,options){
      if(target?.id==='nav'&&options?.childList===true&&options?.subtree!==true){
        this.__undosSuppressFlatNav();
      }
      return super.observe(target,options);
    }
  }

  window.MutationObserver=GuardedMutationObserver;
})();
