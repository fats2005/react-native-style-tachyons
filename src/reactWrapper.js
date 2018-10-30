import React from "react";
import _ from "lodash";
import { styles, options } from "./index";
import cssColors from "css-color-names"
import lineHeights from "./styles/lineHeight"

/*
 * Wrap takes a Component or a render function and recursively replaces
 * the prop 'cls' (or custom overriden prop name) with the respective 'style' definitions.
 * Usually, wrapping a whole Class / Component will do the trick,
 * but for some render functions (e.g. ListView -> renderHeader)
 * this will not work. Hence the such functions need to be wrapped
 *individually
 */
export function wrap(componentOrFunction) {
    if (!(componentOrFunction.prototype && "render" in componentOrFunction.prototype)) {
        const func = componentOrFunction;

        return function wrappedRender(...args) {
            /* eslint-disable no-invalid-this */
            return recursiveStyle(func.apply(this, args))
        };
    }
    const WrappedComponent = componentOrFunction;
    const newClass = class extends WrappedComponent {
        render() {
            return recursiveStyle(super.render());
        }
    }

    /* Fix name */
    newClass.displayName = WrappedComponent.displayName || WrappedComponent.name

    return newClass;
}

function setStyles(props, clsPropName, typeScale) {
    const newProps = {}
    if (_.isArray(props.style)) {
        newProps.style = props.style.slice()

    } else if (_.isObject(props.style)) {
        newProps.style = [props.style]

    } else {
        newProps.style = []
    }

    const splitted = props[clsPropName].replace(/-/g, "_").split(" ")
    const fontSize = _.find(_.keys(typeScale), fSetting => _.includes(splitted, fSetting));

    for (let i = 0; i < splitted.length; i++) {
        const cls = splitted[i];
        if (cls.length > 0) {
            if (styles[cls]) {

                /* Style found */
                newProps.style.push(styles[cls]);

            } else if (cls.startsWith("lh_")) {

                /* Get font style */
                if (!_.isString(fontSize)) {
                    throw new Error(`setting '${cls}' needs explicit font-size`);
                }

                newProps.style.push({
                    lineHeight: lineHeights[cls.replace(/_/g, "-")] * styles[fontSize].fontSize
                })

            } else if (cls.startsWith("bg_")) {
                newProps.style.push({
                    backgroundColor: cls.slice(3)
                })

            } else if (cls.startsWith("b__")) {
                newProps.style.push({
                    borderColor: cls.slice(3)
                })

            } else if (cls.startsWith("tint_")) {
                newProps.style.push({
                    tintColor: cls.slice(3)
                })

            } else if (cssColors[cls] || (/^(rgb|#|hsl)/).test(cls)) {
                newProps.style.push({
                    color: cls
                })

            } else {
                throw new Error(`style '${cls}' not found`);
            }

        }
    }

    return newProps;
}

function recursiveStyle(elementsTree) {
    const { props } = elementsTree;
    const { clsPropName, typeScale } = options;
    let newProps = null;
    let translated = false;

    /* Parse cls string */
    if (_.isString(props[clsPropName])) {
        translated = true;
        newProps = setStyles(props, clsPropName, typeScale);
    }

    let newChildren = props.children;
    if (_.isArray(newChildren)) {

        /* Convert child array */
        newChildren = React.Children.toArray(newChildren);
        for (let i = 0; i < newChildren.length; i++) {
            const c = newChildren[i];
            if (React.isValidElement(c)) {
                const converted = recursiveStyle(c);
                if (converted !== c) {
                    translated = true;
                    newChildren[i] = converted;
                }
            }
        }

    } else if (React.isValidElement(newChildren)) {

        /* Convert single child */
        const converted = recursiveStyle(newChildren);
        if (converted !== newChildren) {
            translated = true;
            newChildren = converted;
        }
    }

    if (translated) {
        return React.cloneElement(elementsTree, newProps, newChildren)
    }

    return elementsTree;
}
