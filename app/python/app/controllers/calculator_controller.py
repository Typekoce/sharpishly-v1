import json
import ast
import operator

class CalculatorController:
    """Safe Math AST evaluator and FastMCP Stdio Server."""

    def evaluate_expression(self, expr: str):
        operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Mod: operator.mod,
            ast.USub: operator.neg,
        }

        def _eval_node(node):
            if isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
                    return node.value
                raise ValueError("Only numeric constants are allowed.")
            elif isinstance(node, ast.BinOp):
                left = _eval_node(node.left)
                right = _eval_node(node.right)
                op_type = type(node.op)
                if op_type in operators:
                    return operators[op_type](left, right)
                raise ValueError(f"Unsupported binary operator: {op_type.__name__}")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval_node(node.operand)
                op_type = type(node.op)
                if op_type in operators:
                    return operators[op_type](operand)
                raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
            else:
                raise ValueError(f"Unsupported AST node: {type(node).__name__}")

        try:
            parsed = ast.parse(expr, mode='eval')
            return _eval_node(parsed.body)
        except Exception as e:
            return f"Calculation Error: {str(e)}"

    def index(self):
        print(json.dumps({"status": "ok", "controller": "CalculatorController", "action": "index"}))

    async def mcp(self):
        """Launch FastMCP stdio server."""
        from mcp.server.fastmcp import FastMCP

        server = FastMCP("calculator-mcp")

        @server.tool()
        def calculate(expression: str) -> str:
            """Safely evaluate mathematical expressions using an AST visitor."""
            return str(self.evaluate_expression(expression))

        await server.run_stdio_async()