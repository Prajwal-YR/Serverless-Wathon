export type Program<A> = {
  a?: A;
  varinits: VarDef<A>[];
  fundefs: FunDef<A>[];
  classdefs: ClassDef<A>[];
  stmts: Stmt<A>[];
};

export type VarDef<A> = {
  a?: A;
  name: string;
  type: Type;
  init: Literal<A>;
};

export type FunDef<A> = {
  a?: A;
  name: string;
  params: TypedVar<A>[];
  ret: Type;
  inits: VarDef<A>[];
  body: Stmt<A>[];
};

export type ClassDef<A> = {
  a?: A;
  name: string;
  fields: VarDef<A>[];
  methods: FunDef<A>[];
};

export type TypedVar<A> = { a?: A; name: string; type: Type };

export type Type = "int" | "bool" | "None" | { tag: "object"; class: string };

export type Literal<A> =
  | { a?: A; tag: "num"; value: number }
  | { a?: A; tag: "bool"; value: boolean }
  | { a?: A; tag: "none" };

export type Stmt<A> =
  | { a?: A; tag: "assign"; lvalue: string | GetAttr<A>; value: Expr<A> }
  | { a?: A; tag: "return"; ret: Expr<A> }
  | { a?: A; tag: "pass" }
  | { a?: A; tag: "if"; cond: Expr<A>; body: Stmt<A>[]; elseBody: Stmt<A>[] }
  | { a?: A; tag: "while"; cond: Expr<A>; body: Stmt<A>[] }
  | { a?: A; tag: "expr"; expr: Expr<A> };

export type GetAttr<A> = { a?: A; tag: "getattr"; obj: Expr<A>; name: string };

export type Expr<A> =
  | { a?: A; tag: "id"; name: string }
  | { a?: A; tag: "builtin1"; name: string; arg: Expr<A> }
  | { a?: A; tag: "builtin2"; name: string; arg1: Expr<A>; arg2: Expr<A> }
  | { a?: A; tag: "binexpr"; op: BinOp; left: Expr<A>; right: Expr<A> }
  | { a?: A; tag: "uniexpr"; op: UniOp; right: Expr<A> }
  | { a?: A; tag: "literal"; literal: Literal<A> }
  | { a?: A; tag: "call"; name: string; args: Expr<A>[]; obj?: Expr<A> }
  | GetAttr<A>;

export enum BinOp {
  Add = "+",
  Sub = "-",
  Mul = "*",
  Div = "//",
  Mod = "%",
  Lesser = "<",
  LessEq = "<=",
  Greater = ">",
  GreatEq = ">=",
  Equals = "==",
  NotEquals = "!=",
  Is = "is",
}

export enum UniOp {
  Not = "not",
  Neg = "-",
}

export type TypeEnv = {
  vars: Map<string, Type>;
  funcs: Map<string, [Type[], Type]>;
  classes: Map<string, ClassEnv>;
  retType: Type; //stores the return type for the current function
};

export type ClassEnv = {
  fields: Map<string, Type>;
  methods: Map<string, [Type[], Type]>;
  // retType: Type
};