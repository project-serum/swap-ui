export function LocalStorage(
  name: string
): [any, (val: any) => void, (val: number) => void] {
  const currentValue = localStorage.getItem(name);
  let addrList = JSON.parse(currentValue as string);

  function setValues(val: any): void {
    addrList = addrList ? addrList : [];
    if (addrList.indexOf(val) == -1) {
      addrList.push(val);
      localStorage.setItem(name, JSON.stringify(addrList));
    }
  }

  function removeValue(index: number): void {
    addrList.splice(index, 1);
    localStorage.setItem(name, JSON.stringify(addrList));
  }

  return [addrList, setValues, removeValue];
}
