module.exports = function plugin(
  { types: t, template },
  { loose = false } = {}
) {
  const buildLoose = template.expression(`
    (%%tmp%% = %%obj%%) && %%expr%%
  `);

  return {
    name: "optional-chaining",

    manipulateOptions(opts) {
      opts.parserOpts.plugins.push("optionalChaining");
    },

    visitor: {
      OptionalMemberExpression(path) {
        let originalPath = path;

        let tmp =
          path.scope.generateUidIdentifier("obj");
        path.scope.push({ id: tmp });

        while (!path.node.optional)
          path = path.get("object");

        let { object } = path.node;

        let memberExpr = tmp;
        do {
          memberExpr = t.memberExpression(
            memberExpr,
            path.node.property,
            path.node.computed,
          );

          if (path === originalPath)
            break;

          path = path.parentPath;
        } while (true);

        if (loose) {
          path.replaceWith(
            buildLoose({
              tmp,
              obj: object,
              expr: memberExpr,
            })
          )
        } else {
          let undef =
            path.scope
            .buildUndefinedNode();

          originalPath.replaceWith(
            template.expression.ast`
              (${tmp} = ${object}) == null
                ? ${undef}
                : ${memberExpr}
            `
          )
        }
      }
    }
  }
};