import * as React from 'react';
import {
  Async,
  autobind,
  BaseComponent,
  classNamesFunction,
  customizable,
  findIndex,
  KeyCodes,
  getId
} from '../../Utilities';
import {
  ISwatchColorPicker,
  ISwatchColorPickerProps,
  ISwatchColorPickerStyleProps,
  ISwatchColorPickerStyles
} from './SwatchColorPicker.types';
import { Grid } from '../../utilities/grid/Grid';
import { IColorCellProps } from './ColorPickerGridCell.types';
import { ColorPickerGridCell } from './ColorPickerGridCell';

export interface ISwatchColorPickerState {
  selectedIndex?: number;
}

const getClassNames = classNamesFunction<ISwatchColorPickerStyleProps, ISwatchColorPickerStyles>();

@customizable('SwatchColorPicker', ['theme'])
export class SwatchColorPickerBase extends BaseComponent<ISwatchColorPickerProps, ISwatchColorPickerState> implements ISwatchColorPicker {

  public static defaultProps = {
    cellShape: 'circle',
    disabled: false,
    shouldFocusCircularNavigate: true
  } as ISwatchColorPickerProps;

  private _id: string;
  private _cellFocused: boolean;

  private navigationIdleTimeoutId: number | undefined;
  private isNavigationIdle: boolean;
  private readonly navigationIdleDelay: number = 250 /* ms */;
  private async: Async;

  constructor(props: ISwatchColorPickerProps) {
    super(props);

    this._id = props.id || getId('swatchColorPicker');

    this._warnMutuallyExclusive({
      'focusOnHover': 'onHover'
    });

    this._warnConditionallyRequiredProps(
      ['focusOnHover'],
      'mouseLeaveParentSelector',
      !!this.props.mouseLeaveParentSelector
    );

    this.isNavigationIdle = true;
    this.async = new Async(this);

    let selectedIndex: number | undefined;
    if (props.selectedId) {
      selectedIndex = this._getSelectedIndex(props.colorCells, props.selectedId);
    }

    this.state = {
      selectedIndex
    };
  }

  public componentWillReceiveProps(newProps: ISwatchColorPickerProps) {
    let newSelectedIndex;

    if (newProps.selectedId) {
      newSelectedIndex = this._getSelectedIndex(newProps.colorCells, newProps.selectedId);
    }

    if (newSelectedIndex !== this.state.selectedIndex) {
      this.setState({
        selectedIndex: newSelectedIndex
      });
    }
  }

  public componentWillUnmount() {
    if (this.props.onCellFocused && this._cellFocused) {
      this._cellFocused = false;
      this.props.onCellFocused();
    }
  }

  public render() {
    const {
      colorCells,
      columnCount,
      positionInSet,
      setSize,
      shouldFocusCircularNavigate,
      className,
      doNotContainWithinFocusZone,
      getStyles,
    } = this.props;

    const classNames = getClassNames(
      getStyles!,
      {
        theme: this.props.theme!,
        className,
      }
    );

    if (colorCells.length < 1 || columnCount < 1) {
      return null;
    }
    return (
      <Grid
        { ...this.props }
        items={ colorCells.map((item, index) => { return { ...item, index: index }; }) }
        columnCount={ columnCount }
        onRenderItem={ this._renderOption }
        positionInSet={ positionInSet && positionInSet }
        setSize={ setSize && setSize }
        shouldFocusCircularNavigate={ shouldFocusCircularNavigate }
        doNotContainWithinFocusZone={ doNotContainWithinFocusZone }
        onBlur={ this._onSwatchColorPickerBlur }
        theme={ this.props.theme! }
        // tslint:disable-next-line:jsx-no-lambda
        getStyles={ (props) => ({
          root: classNames.root,
          tableCell: classNames.tableCell,
          focusedContainer: classNames.focusedContainer
        }) }
      />);
  }

  /**
   * When the whole swatchColorPicker is blurred,
   * make sure to clear the pending focused stated
   */
  @autobind
  private _onSwatchColorPickerBlur() {
    if (this.props.onCellFocused) {
      this._cellFocused = false;
      this.props.onCellFocused();
    }
  }

  /**
   * Get the selected item's index
   * @param items - The items to search
   * @param selectedId - The selected item's id to find
   * @returns {number} - The index of the selected item's id, -1 if there was no match
   */
  private _getSelectedIndex(items: IColorCellProps[], selectedId: string): number | undefined {
    const selectedIndex = findIndex(items, (item => (item.id === selectedId)));
    return selectedIndex >= 0 ? selectedIndex : undefined;
  }

  /**
   * Render a color cell
   * @param item - The item to render
   * @returns {JSX.Element} - Element representing the item
   */
  @autobind
  private _renderOption(item: IColorCellProps): JSX.Element {
    const id = this._id;

    return (
      <ColorPickerGridCell
        item={ item }
        id={ id }
        color={ item.color }
        getStyles={ this.props.getColorGridCellStyles }
        disabled={ this.props.disabled }
        onClick={ this._onCellClick }
        onHover={ this._onGridCellHovered }
        onFocus={ this._onGridCellFocused }
        selected={ this.state.selectedIndex !== undefined && (this.state.selectedIndex === item.index) }
        circle={ this.props.cellShape === 'circle' }
        label={ item.label }
        onMouseEnter={ this._onMouseEnter }
        onMouseMove={ this._onMouseMove }
        onMouseLeave={ this._onMouseLeave }
        onWheel={ this._onWheel }
        onKeyDown={ this._onKeyDown }
      />
    );
  }

  /**
   * Callback passed to the GridCell that will manage triggering the onCellHovered callback for mouseEnter
   */
  @autobind
  private _onMouseEnter(ev: React.MouseEvent<HTMLButtonElement>): boolean {

    if (!this.props.focusOnHover) {
      if (!this.isNavigationIdle || this.props.disabled) {
        return true;
      }

      return false;
    }

    if (this.isNavigationIdle && !this.props.disabled) {
      ev.currentTarget.focus();
    }

    return true;
  }

  /**
   * Callback passed to the GridCell that will manage Hover/Focus updates
   */
  @autobind
  private _onMouseMove(ev: React.MouseEvent<HTMLButtonElement>): boolean {

    if (!this.props.focusOnHover) {
      if (!this.isNavigationIdle || this.props.disabled) {
        return true;
      }

      return false;
    }

    const targetElement = ev.currentTarget as HTMLElement;

    // If navigation is idle and the targetElement is the focused element bail out
    // if (!this.isNavigationIdle || (document && targetElement === (document.activeElement as HTMLElement))) {
    if (this.isNavigationIdle && !(document && targetElement === (document.activeElement as HTMLElement))) {
      targetElement.focus();
    }

    return true;
  }

  /**
   * Callback passed to the GridCell that will manage Hover/Focus updates
   */
  @autobind
  private _onMouseLeave(ev: React.MouseEvent<HTMLButtonElement>): void {

    const parentSelector = this.props.mouseLeaveParentSelector;

    if (!this.props.focusOnHover ||
      !parentSelector ||
      !this.isNavigationIdle ||
      this.props.disabled) {
      return;
    }

    // Get the the elements that math the given selector
    const elements = document.querySelectorAll(parentSelector);

    // iterate over the elements return to make sure it is a parent of the target and focus it
    for (let index = 0; index < elements.length; index += 1) {
      if (elements[index].contains(ev.currentTarget)) {
        /**
         * IE11 focus() method forces parents to scroll to top of element.
         * Edge and IE expose a setActive() function for focusable divs that
         * sets the page focus but does not scroll the parent element.
         */
        if ((elements[index] as any).setActive) {
          (elements[index] as any).setActive();
        } else {
          (elements[index] as HTMLElement).focus();
        }

        break;
      }
    }
  }

  /**
   * Callback to make sure we don't update the hovered element during mouse wheel
   */
  @autobind
  private _onWheel(): void {
    this.setNavigationTimeout();
  }

  /**
   * Callback that
   */
  @autobind
  private _onKeyDown(ev: React.KeyboardEvent<HTMLButtonElement>): void {
    if (
      ev.which === KeyCodes.up ||
      ev.which === KeyCodes.down ||
      ev.which === KeyCodes.left ||
      ev.which === KeyCodes.right
    ) {
      this.setNavigationTimeout();
    }
  }

  /**
   * Sets a timeout so we won't process any mouse "hover" events
   * while navigating (via mouseWheel or arrowKeys)
   */
  private setNavigationTimeout = () => {
    if (!this.isNavigationIdle && this.navigationIdleTimeoutId !== undefined) {
      this.async.clearTimeout(this.navigationIdleTimeoutId);
      this.navigationIdleTimeoutId = undefined;
    } else {
      this.isNavigationIdle = false;
    }

    this.navigationIdleTimeoutId = this.async.setTimeout(() => {
      this.isNavigationIdle = true;
    }, this.navigationIdleDelay);
  }

  /**
   * Callback passed to the GridCell class that will trigger the onCellHovered callback of the SwatchColorPicker
   * NOTE: This will not be triggered if shouldFocusOnHover === true
   */
  @autobind
  private _onGridCellHovered(item?: IColorCellProps): void {
    const { onCellHovered } = this.props;

    if (onCellHovered) {
      return item ? onCellHovered(item.id, item.color) : onCellHovered();
    }
  }

  /**
   * Callback passed to the GridCell class that will trigger the onCellFocus callback of the SwatchColorPicker
   */
  @autobind
  private _onGridCellFocused(item?: IColorCellProps): void {
    const { onCellFocused } = this.props;
    if (onCellFocused) {
      if (item) {
        this._cellFocused = true;
        return onCellFocused(item.id, item.color);
      } else {
        this._cellFocused = false;
        return onCellFocused();
      }
    }
  }

  /**
   * Handle the click on a cell
   * @param item - The cell that the click was fired against
   */
  @autobind
  private _onCellClick(item: IColorCellProps) {
    if (this.props.disabled) {
      return;
    }

    const index = item.index as number;

    // If we have a valid index and it is not already
    // selected, select it
    if (index >= 0 && index !== this.state.selectedIndex) {

      if (this.props.onCellFocused && this._cellFocused) {
        this._cellFocused = false;
        this.props.onCellFocused();
      }

      if (this.props.onColorChanged) {
        this.props.onColorChanged(item.id, item.color);
      }

      this.setState({
        selectedIndex: index
      });
    }
  }
}