(()=>{
const s=document.createElement('style');
s.textContent=`
/* Correcciones de estabilidad visual compartidas */
.student-att-ring{overflow:hidden!important;isolation:isolate}.student-att-ring>div{position:relative;z-index:2;width:78px;max-width:78%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1}.student-att-ring strong{display:block!important;width:100%;font-size:23px!important;line-height:1!important;white-space:nowrap;letter-spacing:-.6px}.student-att-ring small{display:block!important;width:100%;margin:5px 0 0!important;font-size:8px!important;line-height:1.1!important;white-space:normal;color:var(--muted)!important;text-align:center}.student-att-ring:after{z-index:1}.student-att-main-copy{min-width:0;flex:1}.student-att-main-copy h2,.student-att-main-copy p{max-width:100%;overflow-wrap:anywhere}
.card,.panel,.student-att-card,.student-cal-main,.student-cal-side,.comm-card,.comm-side,.dash-panel,.dash-stat,.profile-panel,.profile-id,.profile-account,.gs-group,.gs-searchbox{min-width:0}.top-actions,.page-title,.modal-body,.user-copy{min-width:0}.top-actions{align-items:center}.badge{max-width:100%}.modal-body,.card,.panel,.comm-card,.dash-panel,.profile-panel{overflow-wrap:anywhere}.top-actions .btn{max-width:100%}.table-wrap,.student-att-table{overscroll-behavior-inline:contain}.student-cal-event,.student-smart-row,.gs-result-copy{min-width:0}
@media(max-width:650px){.student-att-ring>div{width:68px}.student-att-ring strong{font-size:20px!important}.student-att-ring small{font-size:7px!important}.top-actions .btn{white-space:nowrap}.modal-body{padding:17px}.form-actions{flex-wrap:wrap}.form-actions .btn{flex:1 1 auto}}
`;
document.head.appendChild(s);
})();
