const ParentController = {
    strength() {
        return 10;
    }
};

const UserController = Object.assign(Object.create(ParentController), {
    name: 'Steve',
    __construct(obj = {}) {
        if (obj && obj.name != null) {
            this.name = obj.name;
        }
        return this;
    },
    getName() {
        return this.name;
    }
});

const ken = Object.create(UserController).__construct({ name: 'ken' });
const ryu = Object.create(UserController).__construct({ name: 'ryu' });

ken.getName();   // 'ken'
ryu.getName();   // 'ryu'
ryu.strength();  // 10