import { Channel } from '../src/index';

async function fromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const item of iter) {
        result.push(item);
    }
    return result;
}

const arraySum = (arr: Array<number>) => arr.reduce((accumulator: number, currentValue: number) => accumulator + currentValue, 0)

test('1 recivier', async () => {
    const channel = new Channel<number>();

    let results = [];

    results.push(fromAsync(channel));

    channel.send(1);
    channel.send(2);
    channel.send(3);
    channel.close();

    results = await Promise.all(results);

    expect(results[0]).toEqual([1, 2, 3]);
});

test('5 reciviers 1 sender', async () => {
    const channel = new Channel<number>();

    let results = [];
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));

    channel.send(1);
    channel.send(2);
    channel.send(3);
    channel.close();

    results = await Promise.all(results);

    expect(results[0]).toEqual([1, 2, 3]);
    expect(results[1]).toEqual([1, 2, 3]);
    expect(results[2]).toEqual([1, 2, 3]);
    expect(results[3]).toEqual([1, 2, 3]);
    expect(results[4]).toEqual([1, 2, 3]);
});

test('5 senders 1 reciver', async () => {
    const channel = new Channel<number>();

    let results = [];
    results.push(fromAsync(channel));

    let senders = [];

    for (let i = 0; i < 5; i++) {
        senders.push((async () => {
            channel.send(1);
            channel.send(2);
            channel.send(3);
            channel.send(4);
            channel.send(5);
        })());
    }

    await Promise.all(senders);

    channel.close();

    results = await Promise.all(results);

    const sum = arraySum(results[0])

    expect(sum).toEqual(75);
});

test('5 senders 5 recivers', async () => {
    const channel = new Channel<number>();

    let results = [];
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));
    results.push(fromAsync(channel));

    let senders = [];

    for (let i = 0; i < 5; i++) {
        senders.push((async () => {
            channel.send(1);
            channel.send(2);
            channel.send(3);
            channel.send(4);
            channel.send(5);
        })());
    }

    await Promise.all(senders);

    channel.close();

    results = await Promise.all(results);

    const sum0 = arraySum(results[0])
    expect(sum0).toEqual(75);

    const sum1 = arraySum(results[1])
    expect(sum1).toEqual(75);

    const sum2 = arraySum(results[2])
    expect(sum2).toEqual(75);

    const sum3 = arraySum(results[3])
    expect(sum3).toEqual(75);

    const sum4 = arraySum(results[4])
    expect(sum4).toEqual(75);
});