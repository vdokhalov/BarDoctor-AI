import type { SalesEventContext, SalesEventCommand } from "../../lib/bardoctor/sales-events";
export function salesEventFixture(): SalesEventContext {
  const assortment = {
    menuItems:[
      {id:"beer",name:"Beer",venueId:1,active:true,type:"ready",consumptionMode:"DIRECT_ITEM",salePrice:20,currency:"MDL",readyProduct:{nomenclatureItemId:"nom-beer",productKey:"beer-stock",packagesPerSale:1}},
      {id:"whisky",name:"Whisky",venueId:1,active:true,type:"ready",consumptionMode:"FIXED_QUANTITY",salePrice:40,currency:"MDL",readyProduct:{nomenclatureItemId:"nom-whisky",productKey:"whisky-stock",packagesPerSale:1},saleSize:{quantity:0.05,unit:"l"}},
      {id:"coffee",name:"Coffee",venueId:1,active:true,type:"composite",consumptionMode:"RECIPE",salePrice:15,currency:"MDL"},
      {id:"ticket",name:"Ticket",venueId:1,active:true,type:"service",consumptionMode:"NONE",salePrice:0,currency:"MDL"}],
    nomenclature:[{id:"nom-beer",productKey:"beer-stock",name:"Beer",unit:"pcs",venueId:1,active:true},
      {id:"nom-whisky",productKey:"whisky-stock",name:"Whisky",unit:"l",venueId:1,active:true},
      {id:"nom-coffee",productKey:"coffee-stock",name:"Beans",unit:"kg",venueId:1,active:true}],
    stockBalances:[{productKey:"beer-stock",name:"Beer",unit:"pcs",current:20,venueId:1,currency:"MDL"},
      {productKey:"whisky-stock",name:"Whisky",unit:"l",current:2,venueId:1,currency:"MDL"},
      {productKey:"coffee-stock",name:"Beans",unit:"kg",current:1,venueId:1,currency:"MDL"}],
    recipes:[{id:"coffee-recipe",menuItemId:"coffee",ownerId:"coffee",venueId:1,version:1,current:true,status:"confirmed",reviewStatus:"approved",
      ingredients:[{id:"beans",nomenclatureItemId:"nom-coffee",purchaseProductKey:"coffee-stock",name:"Beans",quantity:8,unit:"g",normalizedQuantity:0.008,normalizedUnit:"kg",venueId:1}]}]
  };
  return {venueId:1,currency:"MDL",now:"2026-09-09T12:00:00.000Z",actor:{accountId:7,name:"QA",role:"owner"},assortment,
    events:[],revenues:[],mappings:[],warehouseRoutes:[],warehouses:[],closedMonths:new Set(),movements:[]};
}
export function saleCommand(menuItemId="coffee",quantity=10):SalesEventCommand {
  return {id:"event-1",source:"MANUAL_GRID",lines:[{id:"line-1",menuItemId,quantity}]};
}
