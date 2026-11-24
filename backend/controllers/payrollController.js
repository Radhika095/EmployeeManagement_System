const Employee = require("../models/Employee");
const User = require("../models/User");
const { SalaryStructure, Payslip } = require("../models/Payroll");
const fail = (message, status=400) => Object.assign(new Error(message), { status });

exports.list = async (req,res,next) => {
  try {
    let employeeIds;
    if (req.user.role !== "admin") {
      const linked = await Employee.findOne({ email: req.user.email }).select("_id");
      if (!linked) throw fail("Your login email is not linked to an Employee Master record.",404);
      employeeIds = [linked._id];
    }
    const filter = employeeIds ? { employee: { $in: employeeIds } } : {};
    const [employees, structures, payslips] = await Promise.all([
      req.user.role==="admin" ? Employee.find().select("name employeeId email department designation salary").sort({name:1}) : Employee.find({ _id: { $in: employeeIds } }).select("name employeeId email department designation salary"),
      SalaryStructure.find(filter).populate("employee","name employeeId department designation"),
      Payslip.find(filter).sort({year:-1,month:-1}).limit(100)
    ]);
    res.json({ employees, structures, payslips });
  } catch(e) { next(e); }
};

exports.saveStructure = async (req,res,next) => {
  try {
    const { employee, basic, hra, allowances, otherDeductions, pfRate, esiRate, professionalTax, tds, bankName, accountHolder, accountNumber, ifsc } = req.body;
    if (!employee) throw fail("Select an employee.");
    if (![basic,hra,allowances,otherDeductions,pfRate,esiRate,professionalTax,tds].every(v=>Number.isFinite(Number(v)) && Number(v)>=0)) throw fail("Salary and deduction values must be non-negative numbers.");
    const person = await Employee.findById(employee);
    if (!person) throw fail("Employee not found.",404);
    const structure = await SalaryStructure.findOneAndUpdate({employee}, {
      $set: { basic:Number(basic),hra:Number(hra),allowances:Number(allowances),otherDeductions:Number(otherDeductions),pfRate:Number(pfRate),esiRate:Number(esiRate),professionalTax:Number(professionalTax),tds:Number(tds),bankName,accountHolder,accountNumber,ifsc }
    }, {new:true,upsert:true,runValidators:true}).populate("employee","name employeeId department designation");
    res.status(200).json(structure);
  } catch(e) { next(e); }
};

exports.generate = async (req,res,next) => {
  try {
    const month=Number(req.body.month), year=Number(req.body.year);
    if (!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000||year>2200) throw fail("Select a valid payroll month and year.");
    const people=await Employee.find().sort({name:1});
    const structures=await SalaryStructure.find({employee:{$in:people.map(p=>p._id)}});
    const byEmployee=new Map(structures.map(s=>[String(s.employee),s]));
    const results=[];
    for (const p of people) {
      const s=byEmployee.get(String(p._id));
      if (!s) continue;
      const basic=Number(s.basic||0), hra=Number(s.hra||0), allowances=Number(s.allowances||0);
      const gross=basic+hra+allowances;
      const pf=basic*Number(s.pfRate||0)/100, esi=gross*Number(s.esiRate||0)/100;
      const pt=Number(s.professionalTax||0), tds=Number(s.tds||0), other=Number(s.otherDeductions||0);
      const total=pf+esi+pt+tds+other, netPay=gross-total;
      if (netPay<0) throw fail(`Deductions exceed gross pay for ${p.name}. Correct the salary structure first.`);
      const doc=await Payslip.findOneAndUpdate({employee:p._id,month,year},{
        $set:{ employee:p._id,month,year,employeeId:p.employeeId||"",employeeName:p.name,department:p.department,designation:p.designation,
          earnings:{basic,hra,allowances,gross},deductions:{pf,esi,professionalTax:pt,tds,other,total},netPay,
          bankName:s.bankName,accountHolder:s.accountHolder,accountNumber:s.accountNumber,ifsc:s.ifsc,generatedBy:req.user._id }
      },{new:true,upsert:true,runValidators:true});
      results.push(doc);
    }
    res.json({message:`Generated ${results.length} payslip(s). Employees without a salary structure were skipped.`,count:results.length,payslips:results});
  } catch(e) { next(e); }
};
exports.bankAdvice = async (req,res,next) => {
  try {
    const month=Number(req.query.month),year=Number(req.query.year);
    const rows=await Payslip.find({month,year}).sort({employeeName:1});
    const csvCell=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const lines=[["Employee ID","Employee Name","Bank","Account Holder","Account Number","IFSC","Net Pay"].map(csvCell).join(","),
      ...rows.map(p=>[p.employeeId,p.employeeName,p.bankName,p.accountHolder,p.accountNumber,p.ifsc,p.netPay].map(csvCell).join(","))];
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",`attachment; filename="bank-advice-${year}-${String(month).padStart(2,"0")}.csv"`);
    res.send(lines.join("\r\n"));
  } catch(e) { next(e); }
};
