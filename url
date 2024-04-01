import { Component, HostBinding,ViewChild,NgZone } from '@angular/core'; 
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource, MatTreeModule} from '@angular/material/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import { OverlayContainer} from '@angular/cdk/overlay'; 
import { ColDef } from 'ag-grid-community';
import { MatSidenav } from '@angular/material/sidenav'
import {SelectionModel} from '@angular/cdk/collections';
import {FlatTreeControl} from '@angular/cdk/tree';
import {Injectable} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener} from '@angular/material/tree';
import {BehaviorSubject} from 'rxjs';
  
/**
 * Node for to-do item
 */
export class TodoItemNode {
  children: TodoItemNode[]=[];
  item: string="";
}

/** Flat to-do item node with expandable and level information */
export class TodoItemFlatNode {
  item: string="";
  level: number=0;
  expandable: boolean=false;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = {
  Root: {
    Groceries: {
      'Almond Meal flour': null,
      'Organic eggs': null,
      'Protein Powder': null,
      Fruits: {
        Apple: null,
        Berries: ['Blueberry', 'Raspberry'],
        Orange: null
      }
    },
    Reminders: {
      'Cook dinner': null,
      'Read the Material Design spec': null,
      'Upgrade Application to Angular': null,
      Fruits: {
        Apple: null,
        Berries: ['Orange', 'Mango'],
        Orange: null
      }
    },
    Reminders1: {
      'Cook dinner 1': null,
      'Read the Material Design spec 1': null,
      'Upgrade Application to Angular 1': null,
      Fruits: {
        Apple: null,
        Berries: ['Grapes', 'Pomegranate'],
        Orange: null
      }
    },
    Reminders2: {
      'Cook dinner 2': null,
      'Read the Material Design spec 2': null,
      'Upgrade Application to Angular 2': null,
      Fruits: {
        Apple: null,
        Berries: ['Grapes1', 'Pomegranate1'],
        Orange: null
      }
    },
    Reminders3: [
      'Cook dinner 3',
      'Read the Material Design spec 3',
      'Upgrade Application to Angular 3',
    ]
  }
};


/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<TodoItemNode[]>([]);
  get data(): TodoItemNode[] { return this.dataChange.value; }

  constructor() {
    this.initialize();
  }

  initialize() {
    // Build the tree nodes from Json object  . The result is a list of `TodoItemNode` with nested
    //     file node as children.
    const data = this.buildFileTree(TREE_DATA, 0);
    console.log(data)
    // Notify the change.
    this.dataChange.next(data);
  }

  /**
   * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
   * The return value is the list of `TodoItemNode`.
   */
  buildFileTree(obj: {[key: string]: any}, level: number): any[] {
    return Object.keys(obj).reduce<any[]>((accumulator, key) => {
      const value = obj[key];
      const node = new TodoItemNode();
      node.item = key;

      if (value != null) {
        if (typeof value === 'object') {
          node.children = this.buildFileTree(value, level + 1);
        } else {
          node.item = value;
        }
      }

      return accumulator.concat(
        {
          ...node,
          otherInfo: key
        }
      );
    }, []);
  }

  /** Add an item to to-do list */
  insertItem(parent: TodoItemNode, name: string) {
    if (parent.children) {
      parent.children.push({item: name} as TodoItemNode);
      this.dataChange.next(this.data);
    }
  }

  updateItem(node: TodoItemNode, name: string) {
    node.item = name;
    this.dataChange.next(this.data);
  }
}
 
@Component({
  selector: 'app-root',  
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [ChecklistDatabase] 
})
export class AppComponent {
  @HostBinding('class') componentCssClass:any;

  @ViewChild(MatSidenav)
  sidenav!: MatSidenav;

  toggle() {
    this.sidenav.toggle();
  }

  title = 'app-cdd';
  name = 'Angular';

  isExpanded = true;
  showSubmenu: boolean = false;
  isShowing = false;
  showSubSubMenu: boolean = false;
 
   
   // Row Data: The data to be displayed.
 rowData = [
  { make: "Tesla", model: "Model Y", price: 64950 },
  { make: "Ford", model: "F-Series", price: 33850},
  { make: "Toyota", model: "Corolla", price: 29600 },
];

// Column Definitions: Defines the columns to be displayed.
columnDefs: ColDef[] = [
  { field: "make" },
  { field: "model" },
  { field: "price" }
];
 
toggleIt = [];

itemsIt : any[] = [
  {title: "Metadata", content: "content of item 1", panelOpenState: false},
  {title: "item 2", content: "content of item 2", panelOpenState: false},
  {title: "item 3", content: "content of item 3", panelOpenState: false},
  {title: "item 4", content: "content of item 4", panelOpenState: false},
];


 /** Map from flat node to nested node. This helps us finding the nested node to be modified */
 flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();

 searchString = ''

 /** Map from nested node to flattened node. This helps us to keep the same object for selection */
 nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();

 /** A selected parent node to be inserted */
 selectedParent: TodoItemFlatNode | null = null;

 /** The new item's name */
 newItemName = '';

 treeControl: FlatTreeControl<TodoItemFlatNode> ;

 treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

 dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

 /** The selection for checklist */
 checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
 
 
constructor(public overlayContainer: OverlayContainer ,private _database: ChecklistDatabase) {
  this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel,
    this.isExpandable, this.getChildren);
  this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
  this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  _database.dataChange.subscribe(data => {
    this.dataSource.data = data;

    this.treeControl.expand(this.treeControl.dataNodes[0])
  });
}
  
  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.item === node.item
        ? existingNode
        : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  }

  // search filter logic start
  filterLeafNode(node: TodoItemFlatNode): boolean {
    if (!this.searchString) {
      return false
    }
    return node.item.toLowerCase()
      .indexOf(this.searchString?.toLowerCase()) === -1
    
  }

  filterParentNode(node: TodoItemFlatNode): boolean {

    if (
      !this.searchString ||
      node.item.toLowerCase().indexOf(this.searchString?.toLowerCase()) !==
        -1
    ) {
      return false
    }
    const descendants = this.treeControl.getDescendants(node)

    if (
      descendants.some(
        (descendantNode) =>
          descendantNode.item
            .toLowerCase()
            .indexOf(this.searchString?.toLowerCase()) !== -1
      )
    ) {
      return false
    }

    return true
  }
  // search filter logic end

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.length > 0 && descendants.every(child => {
      return this.checklistSelection.isSelected(child);
    });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach(child => this.checklistSelection.isSelected(child));
    this.checkAllParentsSelection(node);
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  todoLeafItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: TodoItemFlatNode): void {
    let parent: TodoItemFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: TodoItemFlatNode): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected = descendants.length > 0 && descendants.every(child => {
      return this.checklistSelection.isSelected(child);
    });
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    var currentLevel:number = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  onSetTheme(theme:any) {
    this.overlayContainer.getContainerElement().classList.add(theme);
    this.componentCssClass = theme;
  }
 
  mouseenter() {
    if (!this.isExpanded) {
      this.isShowing = true;
    }
  }

  mouseleave() {
    if (!this.isExpanded) {
      this.isShowing = false;
    }
  }

}






https://dashboardpack.com/live-demo-free/?livedemo=2380
https://sqlized.vercel.app/?ref=blog.ag-grid.com
http://material-dashboard-lite.creativeit.io/
http://dashboard-auth-demo.creativeit.io/#/app/dashboard
https://demos.creative-tim.com/material-dashboard-pro-angular2/#/dashboard
https://dashboardpack.com/live-demo-free/?livedemo=2380
https://dashboardpack.com/live-demo-free/?livedemo=2380
https://dashboardpack.com/live-demo-free/?livedemo=2380
https://demos.creative-tim.com/material-dashboard-angular2/#/dashboard
https://demos.creative-tim.com/paper-dashboard-pro-angular/#/forms/extended
