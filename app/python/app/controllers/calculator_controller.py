import json
import ast
import operator

class CalculatorController:
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
        from mcp.server import Server
        import mcp.types as types
        from mcp.server.stdio import stdio_server

        server = Server("calculator-mcp")

        @server.list_tools()
        async def handle_list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="calculate",
                    description="Safely evaluate mathematical expressions using an AST visitor.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string", "description": "Math expression (e.g. '10 * 5 + 4')"}
                        },
                        "required": ["expression"]
                    },
                )
            ]

        @server.call_tool()
        async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
            arguments = arguments or {}
            if name == "calculate":
                expr = arguments.get("expression", "")
                result = self.evaluate_expression(expr)
                return [types.TextContent(type="text", text=str(result))]
            raise ValueError(f"Unknown tool: {name}")

        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
