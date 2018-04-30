package org.gridkit.jvmtool.hflame;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.management.ManagementFactory;

import org.gridkit.jvmtool.codec.stacktrace.ThreadSnapshotEvent;
import org.gridkit.jvmtool.codec.stacktrace.ThreadSnapshotExpander;
import org.gridkit.jvmtool.event.Event;
import org.gridkit.jvmtool.event.EventReader;
import org.gridkit.jvmtool.event.ShieldedEventReader;
import org.gridkit.jvmtool.event.UniversalEventWriter;
import org.gridkit.jvmtool.stacktrace.ThreadDumpSampler;
import org.gridkit.jvmtool.stacktrace.ThreadEventCodec;
import org.junit.BeforeClass;
import org.junit.Test;

public class JsonFlameDumpTest {

	public static String testDump;
	
	@BeforeClass
	public static void initDump() throws FileNotFoundException, IOException {
		testDump = "target/dump/" + System.currentTimeMillis() + ".sjk";
		File f = new File(testDump);
		f.getParentFile().mkdirs();
		
        ThreadDumpSampler sampler = new ThreadDumpSampler();
        sampler.enableThreadStackTrace(true);
        
        sampler.connect(ManagementFactory.getThreadMXBean());
		
        UniversalEventWriter uew = ThreadEventCodec.createEventWriter(new FileOutputStream(f));
        ThreadEventAdapter writer = new ThreadEventAdapter(uew);
        
        for(int i = 0; i != 100; ++i) {
        	sampler.collect(writer);
        }        
        
        uew.close();
	}	
	
	@Test
	public void smoke_flame_dump() throws FileNotFoundException, IOException {
		EventReader<Event> reader = ThreadEventCodec.createEventReader(new FileInputStream(testDump));
		EventReader<ThreadSnapshotEvent> traceReader = ShieldedEventReader.shield(reader.morph(new ThreadSnapshotExpander()), ThreadSnapshotEvent.class, true);
		
		JsonFlameDump dump = new JsonFlameDump();
		
		dump.feed(traceReader);
		
		StringBuilder sb = new StringBuilder();
		dump.exportJson(sb);
		System.out.println(sb.toString());		
	}
	
	@Test
	public void smoke_flame_dump_hz1() throws FileNotFoundException, IOException {
		EventReader<Event> reader = ThreadEventCodec.createEventReader(new FileInputStream("src/test/resources/hz1_jvisualvm.sjk"));
		EventReader<ThreadSnapshotEvent> traceReader = ShieldedEventReader.shield(reader.morph(new ThreadSnapshotExpander()), ThreadSnapshotEvent.class, true);
		
		JsonFlameDump dump = new JsonFlameDump();
		
		dump.feed(traceReader);
		
		StringBuilder sb = new StringBuilder();
		dump.exportJson(sb);
		System.out.println(sb.toString());		
	}
	
}
