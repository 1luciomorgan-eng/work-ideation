import {existsSync,readFileSync} from 'node:fs';
export const seeds=existsSync('data/input.json')?JSON.parse(readFileSync('data/input.json','utf8')):[];

export const portals = {
 AZ:{registry:'https://ecorp.azcc.gov/EntitySearch/Index',county:'https://mcassessor.maricopa.gov/'},
 IL:{registry:'https://apps.ilsos.gov/businessentitysearch/',county:'https://www.cookcountyassessor.com/address-search'},
 MI:{registry:'https://cofs.lara.state.mi.us/SearchApi/Search/Search',county:'https://www.michigan.gov/treasury/local/assessment'},
 OH:{registry:'https://businesssearch.ohiosos.gov/',county:'https://myplace.cuyahogacounty.gov/'},
 WA:{registry:'https://ccfs.sos.wa.gov/',county:'https://tcproperty.co.thurston.wa.us/'},
 AL:{registry:'https://arc-sos.state.al.us/CGI/CORPNAME.MBR/INPUT',county:'https://www.jccal.org/Default.asp?ID=342&pg=Tax+Assessor'},
 KS:{registry:'https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx',county:'https://www.sedgwickcounty.org/appraiser/'},
 NY:{registry:'https://apps.dos.ny.gov/publicInquiry/',county:'https://www.monroecounty.gov/etc/rp/'},
 CO:{registry:'https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do',county:'https://www.denvergov.org/property'}
};
export function routing(row){
 const route={...portals[row.state]};
 if(row.county==='Oakland')route.county='https://gis.oakgov.com/PropertyGateway/Home.mvc';
 if(row.county==='Kent')route.county='https://www.accesskent.com/Departments/Equalization/';
 if(row.county==='Delaware')route.county='https://auditor.co.delaware.oh.us/';
 return route;
}
