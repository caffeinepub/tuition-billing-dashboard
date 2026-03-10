import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Char "mo:core/Char";

actor {
  type Student = {
    id : Nat;
    name : Text;
    phone : Text;
    email : Text;
  };

  public type Plan = {
    id : Nat;
    name : Text;
    fee : Nat;
  };

  type PaymentMode = {
    #cash;
    #upi;
  };

  type Payment = {
    id : Nat;
    studentId : Nat;
    planId : Nat;
    planName : Text;
    planAmount : Nat;
    amountPaid : Nat;
    paymentMode : PaymentMode;
    date : Time.Time;
    notes : Text;
  };

  func toLower(t : Text) : Text {
    t.map(func(c : Char) : Char {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(c.toNat32() + 32)
      } else { c }
    })
  };

  func compareStudentByName(a : Student, b : Student) : Order.Order {
    Text.compare(a.name, b.name)
  };

  let students = Map.empty<Nat, Student>();
  var nextStudentId = 1;

  let plans = Map.empty<Nat, Plan>();
  var nextPlanId = 1;

  let payments = Map.empty<Nat, Payment>();
  var nextPaymentId = 1;

  public shared func registerStudent(name : Text, phone : Text, email : Text) : async Nat {
    let id = nextStudentId;
    let student : Student = { id; name; phone; email };
    students.add(id, student);
    nextStudentId += 1;
    id
  };

  public shared func createPlan(name : Text, fee : Nat) : async Nat {
    let id = nextPlanId;
    let plan : Plan = { id; name; fee };
    plans.add(id, plan);
    nextPlanId += 1;
    id
  };

  public query func getPlans() : async [Plan] {
    plans.values().toArray()
  };

  public query func getStudents() : async [Student] {
    students.values().toArray().sort(compareStudentByName)
  };

  public shared func makePayment(studentId : Nat, planId : Nat, amountPaid : Nat, mode : PaymentMode, notes : Text) : async Nat {
    let (planName, planAmount) = switch (plans.get(planId)) {
      case (null) { Runtime.trap("Invalid planId") };
      case (?p) { (p.name, p.fee) };
    };
    switch (students.get(studentId)) {
      case (null) { Runtime.trap("Invalid studentId") };
      case (?_) {};
    };
    let id = nextPaymentId;
    let payment : Payment = {
      id;
      studentId;
      planId;
      planName;
      planAmount;
      amountPaid;
      paymentMode = mode;
      date = Time.now();
      notes;
    };
    payments.add(id, payment);
    nextPaymentId += 1;
    id
  };

  public query func getPaymentsByStudent(studentId : Nat) : async [Payment] {
    payments.values().toArray().filter(func(p : Payment) : Bool { p.studentId == studentId })
  };

  public query func getAllPayments() : async [Payment] {
    payments.values().toArray()
  };

  public query func searchStudents(searchTerm : Text) : async [Student] {
    let q = toLower(searchTerm);
    let matched = students.values().toArray().filter(func(s : Student) : Bool {
      toLower(s.name).contains(#text q) or
      s.phone.contains(#text q) or
      toLower(s.email).contains(#text q)
    });
    matched.sort(compareStudentByName)
  };

  public query func searchStudentsByName(name : Text) : async [Student] {
    let matched = students.values().toArray().filter(func(s : Student) : Bool {
      s.name.contains(#text name)
    });
    matched.sort(compareStudentByName)
  };

  public query func searchStudentsByPhone(phone : Text) : async [Student] {
    students.values().toArray().filter(func(s : Student) : Bool {
      s.phone.contains(#text phone)
    })
  };

  public query func searchStudentsByEmail(email : Text) : async [Student] {
    students.values().toArray().filter(func(s : Student) : Bool {
      s.email.contains(#text email)
    })
  };

  public shared func seedStudents() : async () {
    // Real customers from Happy Foods admin panel
    ignore await registerStudent("Test", "8412918055", "cust1@happyfoods.com");
    ignore await registerStudent("Test", "8055665692", "cust2@happyfoods.com");
    // Additional sample students for testing
    ignore await registerStudent("Aarav Sharma", "9876543210", "aarav.sharma@gmail.com");
    ignore await registerStudent("Priya Patel", "9123456789", "priya.patel@gmail.com");
    ignore await registerStudent("Rohan Mehta", "8899776655", "rohan.mehta@yahoo.com");
  };

  public shared func seedPlans() : async () {
    ignore await createPlan("Monthly Basic", 1500);
    ignore await createPlan("Monthly Standard", 2500);
    ignore await createPlan("Monthly Premium", 4000);
    ignore await createPlan("Quarterly Basic", 4200);
    ignore await createPlan("Quarterly Premium", 11000);
  };

  public shared func addSampleData() : async () {
    await seedStudents();
    await seedPlans();
  };
};
